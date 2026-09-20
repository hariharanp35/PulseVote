package app

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PollReminder struct {
	ID             string    `bson:"_id" json:"id"`
	PollID         string    `bson:"poll_id" json:"pollId"`
	UserID         string    `bson:"user_id" json:"userId"`
	HoursBefore    int       `bson:"hours_before" json:"hoursBefore"`
	ReminderAt     time.Time `bson:"reminder_at" json:"reminderAt"`
	Sent           bool      `bson:"sent" json:"sent"`
	CreatedAt      time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt      time.Time `bson:"updated_at" json:"updatedAt"`
}

func (a *App) ensureReminderIndexes(ctx context.Context) {
	_, _ = a.db.Collection("poll_reminders").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	_, _ = a.db.Collection("poll_reminders").Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "sent", Value: 1}, {Key: "reminder_at", Value: 1}},
	})
}

func (a *App) reminderPoll(ctx context.Context, pollID string) (Poll, error) {
	var poll Poll
	if err := a.db.Collection("polls").FindOne(ctx, bson.M{"_id": pollID}).Decode(&poll); err != nil {
		return poll, err
	}
	a.syncPollLifecycle(ctx, &poll)
	return poll, nil
}

func (a *App) getReminder(c *gin.Context) {
	userID := c.GetString("userId")
	var reminder PollReminder
	err := a.db.Collection("poll_reminders").FindOne(c, bson.M{"poll_id": c.Param("id"), "user_id": userID, "sent": false}).Decode(&reminder)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusOK, gin.H{"success": true, "data": nil})
			return
		}
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to load reminder")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": reminder})
}

func (a *App) setReminder(c *gin.Context) {
	userID := c.GetString("userId")
	var input struct {
		HoursBefore int `json:"hoursBefore"`
	}
	if !decode(c, &input) {
		return
	}
	if input.HoursBefore != 1 && input.HoursBefore != 6 && input.HoursBefore != 24 {
		fail(c, http.StatusBadRequest, "VALIDATION_ERROR", "Choose a reminder 1, 6, or 24 hours before the poll ends")
		return
	}
	poll, err := a.reminderPoll(c, c.Param("id"))
	if err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "Poll not found")
		return
	}
	if poll.Status != "ACTIVE" || poll.ExpiresAt == nil {
		fail(c, http.StatusBadRequest, "REMINDER_UNAVAILABLE", "This poll is no longer accepting reminders")
		return
	}
	if poll.ExpiresAt.Sub(time.Now()) <= time.Duration(input.HoursBefore)*time.Hour {
		fail(c, http.StatusBadRequest, "REMINDER_UNAVAILABLE", "That reminder time has already passed")
		return
	}
	var existing Vote
	if err := a.db.Collection("votes").FindOne(c, bson.M{"poll_id": poll.ID, "user_id": userID}).Decode(&existing); err == nil {
		fail(c, http.StatusBadRequest, "REMINDER_UNAVAILABLE", "Reminders are only available before you vote")
		return
	}
	reminder := PollReminder{
		ID: uuid.NewString(), PollID: poll.ID, UserID: userID, HoursBefore: input.HoursBefore,
		ReminderAt: poll.ExpiresAt.Add(-time.Duration(input.HoursBefore) * time.Hour),
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	_, err = a.db.Collection("poll_reminders").ReplaceOne(c, bson.M{"poll_id": poll.ID, "user_id": userID}, reminder, options.Replace().SetUpsert(true))
	if err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to save reminder")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": reminder})
}

func (a *App) deleteReminder(c *gin.Context) {
	_, err := a.db.Collection("poll_reminders").DeleteOne(c, bson.M{"poll_id": c.Param("id"), "user_id": c.GetString("userId")})
	if err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to cancel reminder")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (a *App) reminderLoop(ctx context.Context) {
	a.ensureReminderIndexes(ctx)
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			a.processDueReminders(ctx, now)
		}
	}
}

func (a *App) processDueReminders(ctx context.Context, now time.Time) {
	cursor, err := a.db.Collection("poll_reminders").Find(ctx, bson.M{"sent": false, "reminder_at": bson.M{"$lte": now}}, options.Find().SetLimit(200))
	if err != nil {
		return
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var reminder PollReminder
		if cursor.Decode(&reminder) != nil {
			continue
		}
		var poll Poll
		if err := a.db.Collection("polls").FindOne(ctx, bson.M{"_id": reminder.PollID}).Decode(&poll); err != nil || poll.Status != "ACTIVE" || poll.ExpiresAt == nil || !poll.ExpiresAt.After(now) {
			_, _ = a.db.Collection("poll_reminders").DeleteOne(ctx, bson.M{"_id": reminder.ID})
			continue
		}
		title := "\u23f0 Poll ending soon: " + strings.TrimSpace(poll.Question)
		message := "Your saved poll ends in about " + formatReminderWindow(reminder.HoursBefore) + "."
		if err := a.createNotification(ctx, reminder.UserID, "POLL_REMINDER", title, message, poll.ID, poll.OwnerID, reminder.ID, bson.M{"hoursBefore": reminder.HoursBefore, "reminderAt": reminder.ReminderAt}); err == nil {
			_, _ = a.db.Collection("poll_reminders").UpdateOne(ctx, bson.M{"_id": reminder.ID, "sent": false}, bson.M{"$set": bson.M{"sent": true, "updated_at": now}})
		}
	}
}

func formatReminderWindow(hours int) string {
	if hours == 24 {
		return "1 day"
	}
	return (time.Duration(hours) * time.Hour).String()
}

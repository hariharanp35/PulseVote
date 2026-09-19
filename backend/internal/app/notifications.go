package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Notification struct {
	ID               string         `bson:"_id" json:"id"`
	RecipientUserID  string         `bson:"recipient_user_id" json:"recipientUserId"`
	Type             string         `bson:"type" json:"type"`
	Title            string         `bson:"title" json:"title"`
	Message          string         `bson:"message" json:"message"`
	PollID           string         `bson:"poll_id,omitempty" json:"pollId,omitempty"`
	ActorUserID      string         `bson:"actor_user_id,omitempty" json:"actorUserId,omitempty"`
	Read             bool           `bson:"read" json:"read"`
	CreatedAt        time.Time      `bson:"created_at" json:"createdAt"`
	UpdatedAt        time.Time      `bson:"updated_at" json:"updatedAt"`
	EventKey         string         `bson:"event_key" json:"eventKey"`
	Metadata         map[string]any `bson:"metadata,omitempty" json:"metadata,omitempty"`
}

type NotificationPreferences struct {
	UserID          string  `bson:"_id" json:"userId"`
	InApp           bool    `bson:"in_app" json:"inApp"`
	Email           bool    `bson:"email" json:"email"`
	Push            bool    `bson:"push" json:"push"`
	VoteReceived    bool    `bson:"vote_received" json:"voteReceived"`
	PollScheduled   bool    `bson:"poll_scheduled" json:"pollScheduled"`
	PollExpiring    bool    `bson:"poll_expiring" json:"pollExpiring"`
	PollClosed      bool    `bson:"poll_closed" json:"pollClosed"`
	Collaboration  bool    `bson:"collaboration" json:"collaboration"`
	System          bool    `bson:"system" json:"system"`
	CreatedAt       time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt       time.Time `bson:"updated_at" json:"updatedAt"`
}

type PushSubscription struct {
	ID          string    `bson:"_id" json:"id"`
	UserID      string    `bson:"user_id" json:"userId"`
	Endpoint    string    `bson:"endpoint" json:"endpoint"`
	P256DH      string    `bson:"p256dh" json:"p256dh"`
	Auth        string    `bson:"auth" json:"auth"`
	CreatedAt   time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `bson:"updated_at" json:"updatedAt"`
}

func defaultNotificationPreferences(userID string) NotificationPreferences {
	return NotificationPreferences{
		UserID: userID,
		InApp: true,
		Email: true,
		Push: false,
		VoteReceived: true,
		PollScheduled: true,
		PollExpiring: true,
		PollClosed: true,
		Collaboration: true,
		System: true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func (p NotificationPreferences) typeEnabled(notificationType string) bool {
	switch notificationType {
	case "VOTE_RECEIVED":
		return p.VoteReceived
	case "POLL_SCHEDULED", "POLL_ACTIVATED":
		return p.PollScheduled
	case "POLL_EXPIRING", "POLL_EXPIRED":
		return p.PollExpiring
	case "POLL_CLOSED", "RESPONSE_LIMIT_REACHED":
		return p.PollClosed
	case "COLLABORATION_INVITE", "COLLABORATION_ACCEPTED", "COLLABORATION_ROLE_CHANGED", "COLLABORATION_REMOVED":
		return p.Collaboration
	case "SYSTEM_NOTIFICATION":
		return p.System
	default:
		return true
	}
}

func notificationEventKey(eventType, eventID, recipientUserID string) string {
	if eventType == "" || eventID == "" || recipientUserID == "" {
		return ""
	}
	hash := sha256.Sum256([]byte(strings.Join([]string{"notification", eventType, eventID, recipientUserID}, ":")))
	return hex.EncodeToString(hash[:])
}

func (a *App) ensureNotificationIndexes(ctx context.Context) {
	_, _ = a.db.Collection("notifications").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "recipient_user_id", Value: 1}, {Key: "created_at", Value: -1}}})
	_, _ = a.db.Collection("notifications").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "event_key", Value: 1}}, Options: options.Index().SetUnique(true)})
	_, _ = a.db.Collection("notification_preferences").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "_id", Value: 1}}, Options: options.Index().SetUnique(true)})
	_, _ = a.db.Collection("push_subscriptions").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "endpoint", Value: 1}}, Options: options.Index().SetUnique(true)})
}

func (a *App) getNotificationPreferences(ctx context.Context, userID string) NotificationPreferences {
	var prefs NotificationPreferences
	if err := a.db.Collection("notification_preferences").FindOne(ctx, bson.M{"_id": userID}).Decode(&prefs); err != nil {
		prefs = defaultNotificationPreferences(userID)
		if _, insertErr := a.db.Collection("notification_preferences").InsertOne(ctx, prefs); insertErr != nil && !mongo.IsDuplicateKeyError(insertErr) {
			return prefs
		}
		return prefs
	}
	if !prefs.InApp && !prefs.Email && !prefs.Push {
		prefs.InApp = true
	}
	if !prefs.Email && prefs.Push && prefs.InApp == false {
		prefs.InApp = true
	}
	return prefs
}

func (a *App) saveNotificationPreferences(ctx context.Context, prefs NotificationPreferences) error {
	p := prefs
	p.UpdatedAt = time.Now()
	_, err := a.db.Collection("notification_preferences").ReplaceOne(ctx, bson.M{"_id": prefs.UserID}, p, options.Replace().SetUpsert(true))
	return err
}

func (a *App) publishUserNotification(ctx context.Context, userID string, notification Notification) {
	payload, _ := json.Marshal(notification)
	if err := a.redis.Publish(ctx, "user:"+userID+":notifications", payload).Err(); err != nil {
		return
	}
}

func (a *App) createNotification(ctx context.Context, recipientUserID string, eventType, title, message string, pollID string, actorUserID string, eventID string, metadata map[string]any) error {
	if recipientUserID == "" || title == "" || message == "" {
		return nil
	}
	prefs := a.getNotificationPreferences(ctx, recipientUserID)
	if !prefs.InApp && !prefs.Email && !prefs.Push {
		return nil
	}
	if !prefs.InApp && !prefs.typeEnabled(eventType) {
		return nil
	}
	if !prefs.typeEnabled(eventType) {
		return nil
	}
	key := notificationEventKey(eventType, eventID, recipientUserID)
	if key == "" {
		return nil
	}
	var existing Notification
	if err := a.db.Collection("notifications").FindOne(ctx, bson.M{"event_key": key}).Decode(&existing); err == nil {
		return nil
	}
	item := Notification{
		ID:              uuid.NewString(),
		RecipientUserID: recipientUserID,
		Type:            eventType,
		Title:           title,
		Message:         message,
		PollID:          pollID,
		ActorUserID:     actorUserID,
		Read:            false,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		EventKey:        key,
		Metadata:        metadata,
	}
	if prefs.InApp {
		if _, err := a.db.Collection("notifications").InsertOne(ctx, item); err != nil {
			return err
		}
		a.publishUserNotification(ctx, recipientUserID, item)
	}
	if prefs.Email {
		_ = a.sendNotificationEmail(ctx, recipientUserID, item)
	}
	if prefs.Push {
		_ = a.sendPushNotifications(ctx, recipientUserID, item)
	}
	return nil
}

func (a *App) listNotifications(c *gin.Context) {
	userID := c.GetString("userId")
	var items []Notification
	cur, err := a.db.Collection("notifications").Find(c, bson.M{"recipient_user_id": userID}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(50))
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load notifications")
		return
	}
	defer cur.Close(c)
	if err = cur.All(c, &items); err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load notifications")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (a *App) unreadNotifications(c *gin.Context) {
	userID := c.GetString("userId")
	count, err := a.db.Collection("notifications").CountDocuments(c, bson.M{"recipient_user_id": userID, "read": false})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to count unread notifications")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"count": count}})
}

func (a *App) markNotificationRead(c *gin.Context) {
	userID := c.GetString("userId")
	result, err := a.db.Collection("notifications").UpdateOne(c, bson.M{"_id": c.Param("id"), "recipient_user_id": userID}, bson.M{"$set": bson.M{"read": true, "updated_at": time.Now()}})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to mark notification as read")
		return
	}
	if result.MatchedCount == 0 {
		fail(c, 404, "NOT_FOUND", "Notification not found")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (a *App) markAllNotificationsRead(c *gin.Context) {
	userID := c.GetString("userId")
	_, err := a.db.Collection("notifications").UpdateMany(c, bson.M{"recipient_user_id": userID, "read": false}, bson.M{"$set": bson.M{"read": true, "updated_at": time.Now()}})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to mark all notifications as read")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (a *App) getNotificationSettings(c *gin.Context) {
	prefs := a.getNotificationPreferences(c, c.GetString("userId"))
	vapidPublicKey := os.Getenv("VAPID_PUBLIC_KEY")
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"settings": prefs, "supportsPush": vapidPublicKey != "", "vapidPublicKey": vapidPublicKey}})
}

func (a *App) updateNotificationSettings(c *gin.Context) {
	var in struct {
		InApp bool `json:"inApp"`
		Email bool `json:"email"`
		Push bool `json:"push"`
		VoteReceived bool `json:"voteReceived"`
		PollScheduled bool `json:"pollScheduled"`
		PollExpiring bool `json:"pollExpiring"`
		PollClosed bool `json:"pollClosed"`
		Collaboration bool `json:"collaboration"`
		System bool `json:"system"`
	}
	if !decode(c, &in) {
		return
	}
	prefs := a.getNotificationPreferences(c, c.GetString("userId"))
	prefs.InApp = in.InApp
	prefs.Email = in.Email
	prefs.Push = in.Push
	prefs.VoteReceived = in.VoteReceived
	prefs.PollScheduled = in.PollScheduled
	prefs.PollExpiring = in.PollExpiring
	prefs.PollClosed = in.PollClosed
	prefs.Collaboration = in.Collaboration
	prefs.System = in.System
	if err := a.saveNotificationPreferences(c, prefs); err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to save notification settings")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": prefs})
}

func (a *App) notificationsStream(c *gin.Context) {
	userID := c.GetString("userId")
	if userID == "" {
		token := strings.TrimSpace(c.Query("token"))
		if token == "" {
			fail(c, 401, "UNAUTHORIZED", "Authentication is required")
			return
		}
		jwtClaims, err := parseToken(token, a.jwtSecret)
		if err != nil || jwtClaims == nil {
			fail(c, 401, "UNAUTHORIZED", "Authentication is required")
			return
		}
		userID = jwtClaims.UserID
		c.Set("userId", userID)
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	pubsub := a.redis.Subscribe(c, "user:"+userID+":notifications")
	defer pubsub.Close()
	c.SSEvent("connected", gin.H{"userId": userID})
	c.Writer.Flush()
	ctx := c.Request.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg := <-pubsub.Channel():
			if msg == nil {
				return
			}
			c.SSEvent("notification", json.RawMessage(msg.Payload))
			c.Writer.Flush()
		}
	}
}

func (a *App) subscribePush(c *gin.Context) {
	var in struct {
		Endpoint string `json:"endpoint"`
		Keys struct {
			P256DH string `json:"p256dh"`
			Auth string `json:"auth"`
		} `json:"keys"`
	}
	if !decode(c, &in) {
		return
	}
	if in.Endpoint == "" || in.Keys.P256DH == "" || in.Keys.Auth == "" {
		fail(c, 400, "VALIDATION_ERROR", "Push subscription is incomplete")
		return
	}
	sub := PushSubscription{ID: uuid.NewString(), UserID: c.GetString("userId"), Endpoint: in.Endpoint, P256DH: in.Keys.P256DH, Auth: in.Keys.Auth, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	_, err := a.db.Collection("push_subscriptions").ReplaceOne(c, bson.M{"user_id": sub.UserID, "endpoint": sub.Endpoint}, sub, options.Replace().SetUpsert(true))
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to store push subscription")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": sub})
}

func (a *App) unsubscribePush(c *gin.Context) {
	_, err := a.db.Collection("push_subscriptions").DeleteMany(c, bson.M{"user_id": c.GetString("userId")})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to disable push notifications")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (a *App) sendPushNotifications(ctx context.Context, userID string, item Notification) error {
	vapidPublic := os.Getenv("VAPID_PUBLIC_KEY")
	vapidPrivate := os.Getenv("VAPID_PRIVATE_KEY")
	if vapidPublic == "" || vapidPrivate == "" {
		return nil
	}
	cur, err := a.db.Collection("push_subscriptions").Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		return err
	}
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var sub PushSubscription
		if err := cur.Decode(&sub); err != nil {
			continue
		}
		if sub.Endpoint == "" {
			continue
		}
	}
	return nil
}

func (a *App) sendNotificationEmail(ctx context.Context, userID string, item Notification) error {
	if env("EMAIL_PROVIDER", "") == "" {
		return nil
	}
	var user User
	if err := a.db.Collection("users").FindOne(ctx, bson.M{"_id": userID}).Decode(&user); err != nil {
		return err
	}
	from := env("EMAIL_FROM", "noreply@pulsvote.local")
	host := env("SMTP_HOST", "")
	port := env("SMTP_PORT", "587")
	username := env("SMTP_USERNAME", "")
	password := env("SMTP_PASSWORD", "")
	if host == "" || username == "" || password == "" {
		return errors.New("smtp configuration is incomplete")
	}
	body := fmt.Sprintf("PulseVote\n\n%s\n\n%s\n\nView Poll: http://localhost:5173/poll/%s\n", item.Title, item.Message, item.PollID)
	auth := smtp.PlainAuth("", username, password, host)
	msg := []byte("To: " + user.Email + "\r\n" +
		"From: " + from + "\r\n" +
		"Subject: [PulseVote] " + item.Title + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n\r\n" +
		body)
	return smtp.SendMail(host+":"+port, auth, from, []string{user.Email}, msg)
}

func parseToken(raw string, secret []byte) (*claims, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, errors.New("missing token")
	}
	token, err := jwtParse(raw, secret)
	if err != nil || !token.Valid {
		return nil, err
	}
	cl, ok := token.Claims.(*claims)
	if !ok {
		return nil, errors.New("missing claims")
	}
	return cl, nil
}

func jwtParse(raw string, secret []byte) (*jwt.Token, error) {
	return jwt.ParseWithClaims(raw, &claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return secret, nil
	})
}

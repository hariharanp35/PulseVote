package app

import (
	"encoding/csv"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func normalizeVisibility(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "AFTER_VOTING":
		return "AFTER_VOTING"
	case "AFTER_CLOSED", "AFTER_POLL_CLOSES":
		return "AFTER_CLOSED"
	case "CREATOR_ONLY":
		return "CREATOR_ONLY"
	default:
		return "ALWAYS_VISIBLE"
	}
}
func normalizeMode(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), "SURVEY") {
		return "SURVEY"
	}
	return "POLL"
}
func minInt64(left, right int64) int64 {
	if left == 0 {
		return right
	}
	if right == 0 || left < right {
		return left
	}
	return right
}
func validatePollSettings(responseLimit, autoCloseAt int64, visibility string, branding Branding, thankYou ThankYou, mode string, questions []SurveyQuestion) error {
	if responseLimit < 0 || autoCloseAt < 0 {
		return errors.New("response and auto-close limits cannot be negative")
	}
	if visibility != "" && normalizeVisibility(visibility) != visibility {
		return errors.New("invalid result visibility")
	}
	if branding.Accent != "" && (len(branding.Accent) != 7 || branding.Accent[0] != '#') {
		return errors.New("accent must be a hex color")
	}
	if thankYou.CTAURL != "" {
		parsed, err := url.Parse(thankYou.CTAURL)
		if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
			return errors.New("CTA URL must use https")
		}
	}
	if normalizeMode(mode) == "SURVEY" {
		if len(questions) < 1 {
			return errors.New("survey must contain at least one question")
		}
		for _, question := range questions {
			if strings.TrimSpace(question.Text) == "" {
				return errors.New("survey questions cannot be empty")
			}
			if question.Type == "SINGLE" || question.Type == "MULTIPLE" || question.Type == "EXACTLY_TWO" {
				if len(question.Options) < 2 {
					return errors.New("choice questions need at least two options")
				}
			}
		}
	}
	return nil
}

type pollTemplate struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

var templates = []pollTemplate{
	{ID: "team-feedback", Name: "Team Feedback", Question: "What should our team improve next?", Options: []string{"Communication", "Planning", "Focus", "Celebration"}},
	{ID: "daily-standup", Name: "Daily Standup", Question: "What is the team's focus today?", Options: []string{"Build", "Fix", "Review", "Plan"}},
	{ID: "classroom", Name: "Classroom Question", Question: "Which topic should we explore next?", Options: []string{"Frontend", "Backend", "Data", "Cloud"}},
	{ID: "event-feedback", Name: "Event Feedback", Question: "What was the most valuable part of this event?", Options: []string{"Talks", "Workshops", "Networking", "Demos"}},
	{ID: "customer-feedback", Name: "Customer Feedback", Question: "What would make this product more useful?", Options: []string{"Speed", "Features", "Guidance", "Integrations"}},
}

func (a *App) templates(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "data": templates})
}

func (a *App) createFromTemplate(c *gin.Context) {
	var in struct {
		TemplateID string   `json:"templateId"`
		Question   string   `json:"question"`
		Options    []string `json:"options"`
	}
	if !decode(c, &in) {
		return
	}
	var selected *pollTemplate
	for i := range templates {
		if templates[i].ID == in.TemplateID {
			selected = &templates[i]
			break
		}
	}
	if selected == nil {
		fail(c, http.StatusNotFound, "TEMPLATE_NOT_FOUND", "Template not found")
		return
	}
	question, options := selected.Question, selected.Options
	if strings.TrimSpace(in.Question) != "" {
		question = in.Question
	}
	if len(in.Options) > 0 {
		options = in.Options
	}
	p, err := validatePoll(question, options)
	if err != nil {
		fail(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}
	now := time.Now()
	p.ID, p.OwnerID, p.Status, p.VotingMode, p.CreatedAt, p.UpdatedAt = newID(), c.GetString("userId"), "ACTIVE", "ANONYMOUS", now, now
	if _, err = a.db.Collection("polls").InsertOne(c, p); err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to create poll")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": p})
}

func (a *App) closePoll(c *gin.Context) {
	result, err := a.db.Collection("polls").UpdateOne(c, bson.M{"_id": c.Param("id"), "owner_id": c.GetString("userId"), "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "CLOSED", "updated_at": time.Now()}})
	if err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to close poll")
		return
	}
	if result.MatchedCount == 0 {
		fail(c, http.StatusNotFound, "NOT_FOUND", "Active poll not found")
		return
	}
	a.getPoll(c)
}

func (a *App) analytics(c *gin.Context) {
	var poll Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id"), "owner_id": c.GetString("userId")}).Decode(&poll); err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "Poll not found")
		return
	}
	type result struct {
		ID         string `json:"optionId"`
		Text       string `json:"text"`
		Votes      int64  `json:"votes"`
		Percentage int    `json:"percentage"`
	}
	results := make([]result, 0, len(poll.Options))
	for _, option := range poll.Options {
		percentage := 0
		if poll.TotalVotes > 0 {
			percentage = int(option.Votes * 100 / poll.TotalVotes)
		}
		results = append(results, result{option.ID, option.Text, option.Votes, percentage})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"pollId": poll.ID, "question": poll.Question, "status": poll.Status, "totalVotes": poll.TotalVotes, "createdAt": poll.CreatedAt, "expiresAt": poll.ExpiresAt, "results": results}})
}

func (a *App) exportCSV(c *gin.Context) {
	var poll Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id"), "owner_id": c.GetString("userId")}).Decode(&poll); err != nil {
		fail(c, http.StatusNotFound, "NOT_FOUND", "Poll not found")
		return
	}
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="pulsvote-`+poll.ID+`.csv"`)
	writer := csv.NewWriter(c.Writer)
	_ = writer.Write([]string{"Poll Question", poll.Question})
	_ = writer.Write([]string{"Poll ID", poll.ID})
	_ = writer.Write([]string{"Status", poll.Status})
	_ = writer.Write([]string{"Total Votes", strconv.FormatInt(poll.TotalVotes, 10)})
	_ = writer.Write([]string{})
	_ = writer.Write([]string{"Option", "Votes", "Percentage"})
	for _, option := range poll.Options {
		percentage := 0
		if poll.TotalVotes > 0 {
			percentage = int(option.Votes * 100 / poll.TotalVotes)
		}
		_ = writer.Write([]string{option.Text, strconv.FormatInt(option.Votes, 10), strconv.Itoa(percentage) + "%"})
	}
	writer.Flush()
}

func (a *App) getResults(c *gin.Context) { a.getPoll(c) }

func (a *App) recordVersion(c *gin.Context, previous Poll, set bson.M, changed []string) {
	var latest PollVersion
	version := 1
	if err := a.db.Collection("poll_versions").FindOne(c, bson.M{"poll_id": previous.ID}, options.FindOne().SetSort(bson.D{{Key: "version", Value: -1}})).Decode(&latest); err == nil {
		version = latest.Version + 1
	}
	_, _ = a.db.Collection("poll_versions").InsertOne(c, PollVersion{ID: uuid.NewString(), PollID: previous.ID, Version: version, Summary: strings.Join(changed, ", ") + " changed", ChangedFields: changed, Snapshot: previous, ChangedBy: c.GetString("userId"), CreatedAt: time.Now()})
}

func (a *App) versions(c *gin.Context) {
	cur, err := a.db.Collection("poll_versions").Find(c, bson.M{"poll_id": c.Param("id")}, options.Find().SetSort(bson.D{{Key: "version", Value: -1}}))
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load version history")
		return
	}
	defer cur.Close(c)
	versions := []PollVersion{}
	if err = cur.All(c, &versions); err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load version history")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": versions})
}

func (a *App) version(c *gin.Context) {
	version, err := strconv.Atoi(c.Param("version"))
	if err != nil {
		fail(c, 400, "VALIDATION_ERROR", "Version must be a number")
		return
	}
	var item PollVersion
	if err = a.db.Collection("poll_versions").FindOne(c, bson.M{"poll_id": c.Param("id"), "version": version}).Decode(&item); err != nil {
		fail(c, 404, "NOT_FOUND", "Version not found")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": item})
}

func (a *App) addBookmark(c *gin.Context) {
	item := Bookmark{ID: uuid.NewString(), PollID: c.Param("id"), UserID: c.GetString("userId"), CreatedAt: time.Now()}
	_, err := a.db.Collection("bookmarks").InsertOne(c, item)
	if mongo.IsDuplicateKeyError(err) {
		c.JSON(200, gin.H{"success": true, "data": item})
		return
	}
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to bookmark poll")
		return
	}
	c.JSON(201, gin.H{"success": true, "data": item})
}
func (a *App) removeBookmark(c *gin.Context) {
	_, err := a.db.Collection("bookmarks").DeleteOne(c, bson.M{"poll_id": c.Param("id"), "user_id": c.GetString("userId")})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to remove bookmark")
		return
	}
	c.JSON(200, gin.H{"success": true})
}
func (a *App) bookmarks(c *gin.Context) {
	cur, err := a.db.Collection("bookmarks").Find(c, bson.M{"user_id": c.GetString("userId")}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load bookmarks")
		return
	}
	defer cur.Close(c)
	items := []Bookmark{}
	_ = cur.All(c, &items)
	c.JSON(200, gin.H{"success": true, "data": items})
}

func newID() string { return uuid.NewString() }

package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID                  string    `bson:"_id" json:"id"`
	Name                string    `bson:"name" json:"name"`
	Email               string    `bson:"email" json:"email"`
	Password            string    `bson:"password" json:"-"`
	CreatedAt           time.Time `bson:"created_at" json:"createdAt"`
	ResetTokenHash      string    `bson:"reset_token_hash,omitempty" json:"-"`
	ResetTokenExpiresAt time.Time `bson:"reset_token_expires_at,omitempty" json:"-"`
}
type Option struct {
	ID    string `bson:"id" json:"id"`
	Text  string `bson:"text" json:"text"`
	Votes int64  `bson:"votes" json:"votes"`
}
type Poll struct {
	ID               string           `bson:"_id" json:"id"`
	OwnerID          string           `bson:"owner_id" json:"ownerId"`
	Question         string           `bson:"question" json:"question"`
	Description      string           `bson:"description,omitempty" json:"description,omitempty"`
	Options          []Option         `bson:"options" json:"options"`
	TotalVotes       int64            `bson:"total_votes" json:"totalVotes"`
	Status           string           `bson:"status" json:"status"`
	VotingMode       string           `bson:"voting_mode" json:"votingMode"`
	ChoiceType       string           `bson:"choice_type" json:"choiceType"`
	MaxSelections    int              `bson:"max_selections,omitempty" json:"maxSelections,omitempty"`
	ExpiresAt        *time.Time       `bson:"expires_at,omitempty" json:"expiresAt,omitempty"`
	StartAt          *time.Time       `bson:"start_at,omitempty" json:"startAt,omitempty"`
	EndAt            *time.Time       `bson:"end_at,omitempty" json:"endAt,omitempty"`
	Theme            string           `bson:"theme,omitempty" json:"theme,omitempty"`
	AllowVoteChange  bool             `bson:"allow_vote_change,omitempty" json:"allowVoteChange,omitempty"`
	ResponseLimit    int64            `bson:"response_limit,omitempty" json:"responseLimit,omitempty"`
	AutoCloseAt      int64            `bson:"auto_close_at,omitempty" json:"autoCloseAt,omitempty"`
	ResultVisibility string           `bson:"result_visibility,omitempty" json:"resultVisibility,omitempty"`
	Branding         Branding         `bson:"branding,omitempty" json:"branding,omitempty"`
	ThankYou         ThankYou         `bson:"thank_you,omitempty" json:"thankYou,omitempty"`
	Mode             string           `bson:"mode,omitempty" json:"mode,omitempty"`
	Questions        []SurveyQuestion `bson:"questions,omitempty" json:"questions,omitempty"`
	CreatedAt        time.Time        `bson:"created_at" json:"createdAt"`
	UpdatedAt        time.Time        `bson:"updated_at" json:"updatedAt"`
}
type Branding struct {
	Theme        string `bson:"theme,omitempty" json:"theme,omitempty"`
	Accent       string `bson:"accent,omitempty" json:"accent,omitempty"`
	Background   string `bson:"background,omitempty" json:"background,omitempty"`
	Font         string `bson:"font,omitempty" json:"font,omitempty"`
	Organization string `bson:"organization,omitempty" json:"organization,omitempty"`
}
type ThankYou struct {
	Title   string `bson:"title,omitempty" json:"title,omitempty"`
	Message string `bson:"message,omitempty" json:"message,omitempty"`
	Icon    string `bson:"icon,omitempty" json:"icon,omitempty"`
	CTAText string `bson:"cta_text,omitempty" json:"ctaText,omitempty"`
	CTAURL  string `bson:"cta_url,omitempty" json:"ctaUrl,omitempty"`
}
type SurveyQuestion struct {
	ID       string   `bson:"id" json:"id"`
	Text     string   `bson:"text" json:"text"`
	Type     string   `bson:"type" json:"type"`
	Options  []string `bson:"options,omitempty" json:"options,omitempty"`
	Required bool     `bson:"required" json:"required"`
}
type PollVersion struct {
	ID            string    `bson:"_id" json:"id"`
	PollID        string    `bson:"poll_id" json:"pollId"`
	Version       int       `bson:"version" json:"version"`
	Summary       string    `bson:"summary" json:"summary"`
	ChangedFields []string  `bson:"changed_fields" json:"changedFields"`
	Snapshot      Poll      `bson:"snapshot" json:"snapshot"`
	ChangedBy     string    `bson:"changed_by" json:"changedBy"`
	CreatedAt     time.Time `bson:"created_at" json:"createdAt"`
}
type Bookmark struct {
	ID        string    `bson:"_id" json:"id"`
	PollID    string    `bson:"poll_id" json:"pollId"`
	UserID    string    `bson:"user_id" json:"userId"`
	CreatedAt time.Time `bson:"created_at" json:"createdAt"`
}
type Vote struct {
	ID            string    `bson:"_id" json:"id"`
	PollID        string    `bson:"poll_id" json:"pollId"`
	UserID        string    `bson:"user_id,omitempty" json:"userId,omitempty"`
	Question      string    `bson:"question,omitempty" json:"question,omitempty"`
	OptionID      string    `bson:"option_id,omitempty" json:"optionId,omitempty"`
	OptionIDs     []string  `bson:"option_ids,omitempty" json:"optionIds,omitempty"`
	OptionTexts   []string  `bson:"option_texts,omitempty" json:"optionTexts,omitempty"`
	VoterID       string    `bson:"voter_id" json:"voterId"`
	CreatedAt     time.Time `bson:"created_at" json:"createdAt"`
	UpdatedAt     time.Time `bson:"updated_at,omitempty" json:"updatedAt,omitempty"`
	PollStatus    string    `bson:"poll_status,omitempty" json:"pollStatus,omitempty"`
	CreatorUserID string    `bson:"creator_user_id,omitempty" json:"creatorUserId,omitempty"`
	CreatorName   string    `bson:"creator_name,omitempty" json:"creatorName,omitempty"`
}
type App struct {
	db        *mongo.Database
	redis     *redis.Client
	jwtSecret []byte
}
type claims struct {
	UserID string `json:"userId"`
	jwt.RegisteredClaims
}

func New(ctx context.Context) (*gin.Engine, func(), error) {
	mongoURI := env("MONGO_URI", "mongodb://localhost:27017")
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return nil, nil, err
	}
	if err = mongoClient.Ping(ctx, nil); err != nil {
		return nil, nil, err
	}
	db := mongoClient.Database(env("MONGO_DATABASE", "pulsvote"))
	_, _ = db.Collection("users").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "email", Value: 1}}, Options: options.Index().SetUnique(true)})
	_, _ = db.Collection("votes").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "voter_id", Value: 1}}, Options: options.Index().SetUnique(true)})
	_, _ = db.Collection("votes").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "created_at", Value: -1}}})
	_, _ = db.Collection("bookmarks").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "user_id", Value: 1}}, Options: options.Index().SetUnique(true)})
	_, _ = db.Collection("poll_versions").Indexes().CreateOne(ctx, mongo.IndexModel{Keys: bson.D{{Key: "poll_id", Value: 1}, {Key: "version", Value: -1}}})
	redisOptions, err := redis.ParseURL(env("REDIS_URL", "redis://localhost:6379"))
	if err != nil {
		return nil, nil, err
	}
	redisClient := redis.NewClient(redisOptions)
	if err = redisClient.Ping(ctx).Err(); err != nil {
		return nil, nil, err
	}
	a := &App{db: db, redis: redisClient, jwtSecret: []byte(env("JWT_SECRET", "development-secret-change-me"))}
	a.ensureNotificationIndexes(context.Background())
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), cors.New(cors.Config{AllowOrigins: splitOrigins(env("CORS_ORIGINS", "http://localhost:5173")), AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, AllowHeaders: []string{"Origin", "Content-Type", "Authorization", "X-Voter-ID"}}))
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"status": "ok"}}) })
	api := r.Group("/api")
	api.POST("/auth/signup", a.signup)
	api.POST("/auth/login", a.login)
	api.POST("/auth/forgot-password", a.forgotPassword)
	api.POST("/auth/reset-password", a.resetPassword)
	api.POST("/auth/logout", a.auth(), func(c *gin.Context) { c.JSON(200, gin.H{"success": true, "message": "Logged out"}) })
	api.GET("/auth/me", a.auth(), a.me)
	api.GET("/profile", a.auth(), a.profile)
	api.GET("/profile/activity", a.auth(), a.profileActivity)
	api.GET("/polls/:id", a.optionalAuth(), a.getPoll)
	api.GET("/polls/:id/results", a.optionalAuth(), a.getResults)
	api.POST("/polls/:id/vote", a.optionalAuth(), a.vote)
	api.GET("/polls/:id/stream", a.optionalAuth(), a.stream)
	api.GET("/notifications/stream", a.auth(), a.notificationsStream)
	api.GET("/templates", a.templates)
	protected := api.Group("", a.auth())
	protected.GET("/notifications", a.listNotifications)
	protected.GET("/notifications/unread-count", a.unreadNotifications)
	protected.PATCH("/notifications/:id/read", a.markNotificationRead)
	protected.PATCH("/notifications/read-all", a.markAllNotificationsRead)
	protected.GET("/notifications/settings", a.getNotificationSettings)
	protected.PATCH("/notifications/settings", a.updateNotificationSettings)
	protected.POST("/notifications/push-subscribe", a.subscribePush)
	protected.DELETE("/notifications/push-subscribe", a.unsubscribePush)
	protectedPolls := api.Group("/polls", a.auth())
	protectedPolls.GET("", a.listPolls)
	protectedPolls.GET("/bookmarks", a.bookmarks)
	protectedPolls.POST("", a.createPoll)
	protectedPolls.POST("/from-template", a.createFromTemplate)
	protectedPolls.PUT("/:id", a.updatePoll)
	protectedPolls.DELETE("/:id", a.deletePoll)
	protectedPolls.POST("/:id/close", a.closePoll)
	protectedPolls.GET("/:id/analytics", a.analytics)
	protectedPolls.GET("/:id/export", a.exportCSV)
	protectedPolls.GET("/:id/versions", a.versions)
	protectedPolls.GET("/:id/versions/:version", a.version)
	protectedPolls.POST("/:id/bookmark", a.addBookmark)
	protectedPolls.DELETE("/:id/bookmark", a.removeBookmark)
	cleanup := func() { _ = mongoClient.Disconnect(context.Background()); _ = redisClient.Close() }
	return r, cleanup, nil
}

func (a *App) signup(c *gin.Context) {
	var in struct{ Name, Email, Password string }
	if !decode(c, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	if len(in.Name) < 2 || len(in.Name) > 80 || !strings.Contains(in.Email, "@") || len(in.Password) < 8 {
		fail(c, http.StatusBadRequest, "VALIDATION_ERROR", "Enter a name, valid email, and password of at least 8 characters")
		return
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	u := User{ID: uuid.NewString(), Name: in.Name, Email: in.Email, Password: string(hash), CreatedAt: time.Now()}
	_, err := a.db.Collection("users").InsertOne(c, u)
	if mongo.IsDuplicateKeyError(err) {
		fail(c, http.StatusConflict, "EMAIL_EXISTS", "An account with this email already exists")
		return
	}
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to create account")
		return
	}
	token, _ := a.token(u.ID)
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"token": token, "user": u}})
}
func (a *App) login(c *gin.Context) {
	var in struct{ Email, Password string }
	if !decode(c, &in) {
		return
	}
	var u User
	err := a.db.Collection("users").FindOne(c, bson.M{"email": strings.ToLower(strings.TrimSpace(in.Email))}).Decode(&u)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(in.Password)) != nil {
		fail(c, 401, "INVALID_CREDENTIALS", "Email or password is incorrect")
		return
	}
	token, _ := a.token(u.ID)
	c.JSON(200, gin.H{"success": true, "data": gin.H{"token": token, "user": u}})
}

func hashResetToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (a *App) forgotPassword(c *gin.Context) {
	var in struct {
		Email string `json:"email"`
	}
	if !decode(c, &in) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	// Always return the same response to prevent account enumeration.
	message := "If an account exists for this email, password reset instructions will be sent."
	var user User
	if err := a.db.Collection("users").FindOne(c, bson.M{"email": email}).Decode(&user); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": message})
		return
	}
	rawToken := make([]byte, 32)
	if _, err := rand.Read(rawToken); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": message})
		return
	}
	token := hex.EncodeToString(rawToken)
	expiresAt := time.Now().Add(30 * time.Minute)
	_, err := a.db.Collection("users").UpdateOne(c, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"reset_token_hash": hashResetToken(token), "reset_token_expires_at": expiresAt}})
	if err == nil {
		_ = a.sendPasswordResetEmail(user.Email, token)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": message})
}

func (a *App) resetPassword(c *gin.Context) {
	var in struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !decode(c, &in) {
		return
	}
	if len(in.Password) < 8 {
		fail(c, http.StatusBadRequest, "VALIDATION_ERROR", "Password must be at least 8 characters")
		return
	}
	var user User
	err := a.db.Collection("users").FindOne(c, bson.M{"reset_token_hash": hashResetToken(strings.TrimSpace(in.Token)), "reset_token_expires_at": bson.M{"$gt": time.Now()}}).Decode(&user)
	if err != nil {
		fail(c, http.StatusBadRequest, "RESET_TOKEN_INVALID", "This password reset link is invalid or has expired. Please request a new reset link.")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to reset password")
		return
	}
	_, err = a.db.Collection("users").UpdateOne(c, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"password": string(hash)}, "$unset": bson.M{"reset_token_hash": "", "reset_token_expires_at": ""}})
	if err != nil {
		fail(c, http.StatusInternalServerError, "DATABASE_ERROR", "Unable to reset password")
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password reset successfully"})
}

func (a *App) sendPasswordResetEmail(email, token string) error {
	host := env("SMTP_HOST", "")
	port := env("SMTP_PORT", "587")
	username := env("SMTP_USERNAME", "")
	password := env("SMTP_PASSWORD", "")
	if host == "" || username == "" || password == "" {
		return errors.New("smtp configuration is incomplete")
	}
	from := env("EMAIL_FROM", "noreply@pulsvote.local")
	baseURL := env("APP_PUBLIC_URL", "http://localhost:5173")
	link := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(baseURL, "/"), token)
	body := "PulseVote\n\nReset your password using this link (expires in 30 minutes):\n" + link + "\n"
	auth := smtp.PlainAuth("", username, password, host)
	msg := []byte("To: " + email + "\r\nFrom: " + from + "\r\nSubject: PulseVote password reset\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body)
	return smtp.SendMail(host+":"+port, auth, from, []string{email}, msg)
}
func (a *App) me(c *gin.Context) {
	var u User
	if err := a.db.Collection("users").FindOne(c, bson.M{"_id": c.GetString("userId")}).Decode(&u); err != nil {
		fail(c, 404, "NOT_FOUND", "User not found")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": u})
}

func (a *App) profile(c *gin.Context) {
	userID := c.GetString("userId")
	var u User
	if err := a.db.Collection("users").FindOne(c, bson.M{"_id": userID}).Decode(&u); err != nil {
		fail(c, 404, "NOT_FOUND", "User not found")
		return
	}
	items, total, err := a.getProfileActivityItems(c, userID, 1, 5)
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load profile activity")
		return
	}
	activeTotal, completedTotal, err := a.getProfileActivityStats(c, userID)
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load profile activity summary")
		return
	}
	summary := map[string]any{
		"totalPollsParticipated": total,
		"totalQuestionsAnswered": total,
		"totalVotesCast":         total,
		"activePolls":            activeTotal,
		"completedPolls":         completedTotal,
		"recentActivityCount":    len(items),
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"user": u, "summary": summary, "activity": items, "page": 1, "limit": 5, "total": total, "hasMore": total > len(items)}})
}

func (a *App) profileActivity(c *gin.Context) {
	userID := c.GetString("userId")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	if limit < 1 {
		limit = 5
	}
	if limit > 50 {
		limit = 50
	}
	items, total, err := a.getProfileActivityItems(c, userID, page, limit)
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load profile activity")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": gin.H{"items": items, "page": page, "limit": limit, "total": total, "hasMore": total > (page * limit)}})
}

func (a *App) getProfileActivityItems(c *gin.Context, userID string, page int, limit int) ([]map[string]any, int, error) {
	skip := (page - 1) * limit
	findOpts := options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}, {Key: "created_at", Value: -1}}).SetSkip(int64(skip)).SetLimit(int64(limit))
	cur, err := a.db.Collection("votes").Find(c, bson.M{"user_id": userID}, findOpts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(c)
	votes := make([]Vote, 0)
	if err = cur.All(c, &votes); err != nil {
		return nil, 0, err
	}
	count, err := a.db.Collection("votes").CountDocuments(c, bson.M{"user_id": userID})
	if err != nil {
		return nil, 0, err
	}
	items := make([]map[string]any, 0, len(votes))
	for _, vote := range votes {
		selectedAnswer := strings.Join(vote.OptionTexts, ", ")
		if selectedAnswer == "" && len(vote.OptionIDs) > 0 {
			selectedAnswer = strings.Join(vote.OptionIDs, ", ")
		}
		if selectedAnswer == "" && vote.OptionID != "" {
			selectedAnswer = vote.OptionID
		}
		pollStatus := vote.PollStatus
		question := vote.Question
		creatorName := vote.CreatorName
		var poll Poll
		if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": vote.PollID}).Decode(&poll); err == nil {
			a.syncPollLifecycle(c, &poll)
			a.markExpired(c, &poll)
			pollStatus = poll.Status
			if question == "" {
				question = poll.Question
			}
			if creatorName == "" && poll.OwnerID != "" {
				var creator User
				if err := a.db.Collection("users").FindOne(c, bson.M{"_id": poll.OwnerID}).Decode(&creator); err == nil {
					creatorName = creator.Name
				}
			}
		}
		if selectedAnswer == "" {
			selectedAnswer = "No answer recorded"
		}
		items = append(items, map[string]any{
			"id":              vote.ID,
			"pollId":          vote.PollID,
			"question":        question,
			"selectedAnswer":  selectedAnswer,
			"selectedAnswers": vote.OptionTexts,
			"pollStatus":      pollStatus,
			"creatorName":     creatorName,
			"startAt":         poll.StartAt,
			"endAt":           poll.EndAt,
			"pollOptions":     poll.Options,
			"createdAt":       vote.CreatedAt,
			"updatedAt":       vote.UpdatedAt,
		})
	}
	return items, int(count), nil
}

func (a *App) getProfileActivityStats(c *gin.Context, userID string) (int, int, error) {
	cur, err := a.db.Collection("votes").Find(c, bson.M{"user_id": userID})
	if err != nil {
		return 0, 0, err
	}
	defer cur.Close(c)
	var votes []Vote
	if err := cur.All(c, &votes); err != nil {
		return 0, 0, err
	}
	active, completed := 0, 0
	seen := make(map[string]bool)
	for _, vote := range votes {
		if seen[vote.PollID] {
			continue
		}
		seen[vote.PollID] = true
		var poll Poll
		if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": vote.PollID}).Decode(&poll); err != nil {
			continue
		}
		a.syncPollLifecycle(c, &poll)
		a.markExpired(c, &poll)
		if poll.Status == "ACTIVE" {
			active++
		} else {
			completed++
		}
	}
	return active, completed, nil
}

func (a *App) listPolls(c *gin.Context) {
	cur, err := a.db.Collection("polls").Find(c, bson.M{"owner_id": c.GetString("userId")}, options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load polls")
		return
	}
	defer cur.Close(c)
	polls := []Poll{}
	if err = cur.All(c, &polls); err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to load polls")
		return
	}
	for index := range polls {
		a.syncPollLifecycle(c, &polls[index])
		a.markExpired(c, &polls[index])
	}
	c.JSON(200, gin.H{"success": true, "data": polls})
}
func (a *App) createPoll(c *gin.Context) {
	var in struct {
		Question         string           `json:"question"`
		Description      string           `json:"description"`
		Options          []string         `json:"options"`
		VotingMode       string           `json:"votingMode"`
		ChoiceType       string           `json:"choiceType"`
		MaxSelections    int              `json:"maxSelections"`
		ExpiresAt        *time.Time       `json:"expiresAt"`
		StartAt          *time.Time       `json:"startAt"`
		EndAt            *time.Time       `json:"endAt"`
		Theme            string           `json:"theme"`
		AllowVoteChange  bool             `json:"allowVoteChange"`
		ResponseLimit    int64            `json:"responseLimit"`
		AutoCloseAt      int64            `json:"autoCloseAt"`
		ResultVisibility string           `json:"resultVisibility"`
		Branding         Branding         `json:"branding"`
		ThankYou         ThankYou         `json:"thankYou"`
		Mode             string           `json:"mode"`
		Questions        []SurveyQuestion `json:"questions"`
	}
	if !decode(c, &in) {
		return
	}
	p, err := validatePoll(in.Question, in.Options)
	if err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	if in.VotingMode == "" {
		in.VotingMode = "ANONYMOUS"
	}
	if in.VotingMode != "ANONYMOUS" && in.VotingMode != "NAMED" {
		fail(c, 400, "VALIDATION_ERROR", "votingMode must be ANONYMOUS or NAMED")
		return
	}
	choiceType, err := normalizeChoiceType(in.ChoiceType)
	if err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	if err := validateChoiceTypeSettings(choiceType, in.MaxSelections); err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	if in.ExpiresAt != nil && !in.ExpiresAt.After(time.Now()) {
		fail(c, 400, "VALIDATION_ERROR", "expiry must be in the future")
		return
	}
	if in.StartAt != nil && in.EndAt != nil && in.EndAt.Before(*in.StartAt) {
		fail(c, 400, "VALIDATION_ERROR", "poll end time must be after the start time")
		return
	}
	if err := validatePollSettings(in.ResponseLimit, in.AutoCloseAt, in.ResultVisibility, in.Branding, in.ThankYou, in.Mode, in.Questions); err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	status := "ACTIVE"
	if in.StartAt != nil && in.StartAt.After(time.Now()) {
		status = "SCHEDULED"
	}
	p.ID, p.OwnerID, p.Description, p.Status, p.VotingMode, p.ChoiceType, p.MaxSelections, p.ExpiresAt, p.StartAt, p.EndAt, p.Theme, p.AllowVoteChange, p.ResponseLimit, p.AutoCloseAt, p.ResultVisibility, p.Branding, p.ThankYou, p.Mode, p.Questions, p.CreatedAt, p.UpdatedAt = uuid.NewString(), c.GetString("userId"), strings.TrimSpace(in.Description), status, in.VotingMode, choiceType, in.MaxSelections, in.ExpiresAt, in.StartAt, in.EndAt, strings.TrimSpace(in.Theme), in.AllowVoteChange, in.ResponseLimit, in.AutoCloseAt, normalizeVisibility(in.ResultVisibility), in.Branding, in.ThankYou, normalizeMode(in.Mode), in.Questions, time.Now(), time.Now()
	_, err = a.db.Collection("polls").InsertOne(c, p)
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to create poll")
		return
	}
	if p.Status == "SCHEDULED" {
		_ = a.createNotification(c, c.GetString("userId"), "POLL_SCHEDULED", "Poll scheduled", "Your poll is scheduled and will start at the selected time.", p.ID, c.GetString("userId"), p.ID, bson.M{"scheduledAt": p.StartAt})
	}
	c.JSON(201, gin.H{"success": true, "data": p})
}
func (a *App) updatePoll(c *gin.Context) {
	var in struct {
		Question         string            `json:"question"`
		Options          []string          `json:"options"`
		Description      *string           `json:"description"`
		VotingMode       *string           `json:"votingMode"`
		ChoiceType       *string           `json:"choiceType"`
		MaxSelections    *int              `json:"maxSelections"`
		ExpiresAt        *time.Time        `json:"expiresAt"`
		StartAt          json.RawMessage   `json:"startAt"`
		EndAt            json.RawMessage   `json:"endAt"`
		ResponseLimit    *int64            `json:"responseLimit"`
		AutoCloseAt      *int64            `json:"autoCloseAt"`
		ResultVisibility *string           `json:"resultVisibility"`
		Branding         *Branding         `json:"branding"`
		ThankYou         *ThankYou         `json:"thankYou"`
		Mode             *string           `json:"mode"`
		Questions        *[]SurveyQuestion `json:"questions"`
	}
	if !decode(c, &in) {
		return
	}
	var current Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id"), "owner_id": c.GetString("userId")}).Decode(&current); err != nil {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	validated, err := validatePoll(in.Question, in.Options)
	if err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	preserved, err := preserveOptionResults(current.Options, validated.Options)
	if err != nil {
		fail(c, 409, "VOTED_OPTION_REQUIRED", err.Error())
		return
	}
	validated.Options = preserved
	choiceType := current.ChoiceType
	if choiceType == "" {
		choiceType = "SINGLE"
	}
	maxSelections := current.MaxSelections
	if in.ChoiceType != nil {
		choiceType, err = normalizeChoiceType(*in.ChoiceType)
		if err != nil {
			fail(c, 400, "VALIDATION_ERROR", err.Error())
			return
		}
	}
	if in.MaxSelections != nil {
		maxSelections = *in.MaxSelections
	}
	if err := validateChoiceTypeSettings(choiceType, maxSelections); err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	responseLimit := current.ResponseLimit
	if in.ResponseLimit != nil {
		responseLimit = *in.ResponseLimit
	}
	autoCloseAt := current.AutoCloseAt
	if in.AutoCloseAt != nil {
		autoCloseAt = *in.AutoCloseAt
	}
	visibility := current.ResultVisibility
	if in.ResultVisibility != nil {
		visibility = *in.ResultVisibility
	}
	branding := current.Branding
	if in.Branding != nil {
		branding = *in.Branding
	}
	thankYou := current.ThankYou
	if in.ThankYou != nil {
		thankYou = *in.ThankYou
	}
	mode := current.Mode
	if in.Mode != nil {
		mode = *in.Mode
	}
	questions := current.Questions
	if in.Questions != nil {
		questions = *in.Questions
	}
	if err := validatePollSettings(responseLimit, autoCloseAt, visibility, branding, thankYou, mode, questions); err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	set := bson.M{"question": validated.Question, "options": validated.Options, "updated_at": time.Now(), "choice_type": choiceType, "max_selections": maxSelections, "response_limit": responseLimit, "auto_close_at": autoCloseAt, "result_visibility": normalizeVisibility(visibility), "branding": branding, "thank_you": thankYou, "mode": normalizeMode(mode), "questions": questions}
	unset := bson.M{}
	if len(in.StartAt) > 0 || len(in.EndAt) > 0 {
		var startAt, endAt *time.Time
		if len(in.StartAt) > 0 && string(in.StartAt) != "null" {
			startAt = new(time.Time)
			if err := json.Unmarshal(in.StartAt, startAt); err != nil {
				fail(c, 400, "VALIDATION_ERROR", "invalid schedule start time")
				return
			}
		}
		if len(in.EndAt) > 0 && string(in.EndAt) != "null" {
			endAt = new(time.Time)
			if err := json.Unmarshal(in.EndAt, endAt); err != nil {
				fail(c, 400, "VALIDATION_ERROR", "invalid schedule end time")
				return
			}
		}
		if startAt != nil && !startAt.After(time.Now()) {
			fail(c, 400, "VALIDATION_ERROR", "schedule start must be in the future")
			return
		}
		if startAt != nil && endAt != nil && endAt.Before(*startAt) {
			fail(c, 400, "VALIDATION_ERROR", "poll end time must be after the start time")
			return
		}
		if startAt != nil {
			set["start_at"] = startAt
		} else {
			unset["start_at"] = ""
		}
		if endAt != nil {
			set["end_at"] = endAt
			set["expires_at"] = endAt
		} else {
			unset["end_at"] = ""
		}
	}
	if in.Description != nil {
		set["description"] = strings.TrimSpace(*in.Description)
	}
	if in.VotingMode != nil {
		if *in.VotingMode != "ANONYMOUS" && *in.VotingMode != "NAMED" {
			fail(c, 400, "VALIDATION_ERROR", "votingMode must be ANONYMOUS or NAMED")
			return
		}
		set["voting_mode"] = *in.VotingMode
	}
	if in.ExpiresAt != nil {
		if !in.ExpiresAt.After(time.Now()) {
			fail(c, 400, "VALIDATION_ERROR", "expiry must be in the future")
			return
		}
		set["expires_at"] = in.ExpiresAt
	}
	changed := []string{}
	if current.Question != validated.Question {
		changed = append(changed, "question")
	}
	if !sameOptions(current.Options, validated.Options) {
		changed = append(changed, "options")
	}
	if current.ResponseLimit != responseLimit {
		changed = append(changed, "responseLimit")
	}
	if current.AutoCloseAt != autoCloseAt {
		changed = append(changed, "autoCloseAt")
	}
	if current.ResultVisibility != normalizeVisibility(visibility) {
		changed = append(changed, "resultVisibility")
	}
	update := bson.M{"$set": set}
	if len(unset) > 0 {
		update["$unset"] = unset
	}
	result, err := a.db.Collection("polls").UpdateOne(c, bson.M{"_id": current.ID, "owner_id": c.GetString("userId")}, update)
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to update poll")
		return
	}
	if result.MatchedCount == 0 {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	if len(changed) > 0 {
		a.recordVersion(c, current, set, changed)
	}
	a.getPoll(c)
}
func (a *App) deletePoll(c *gin.Context) {
	result, err := a.db.Collection("polls").DeleteOne(c, bson.M{"_id": c.Param("id"), "owner_id": c.GetString("userId")})
	if err != nil {
		fail(c, 500, "DATABASE_ERROR", "Unable to delete poll")
		return
	}
	if result.DeletedCount == 0 {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	c.JSON(200, gin.H{"success": true, "message": "Poll deleted"})
}
func (a *App) getPoll(c *gin.Context) {
	var p Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id")}).Decode(&p); err != nil {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	a.syncPollLifecycle(c, &p)
	a.markExpired(c, &p)
	p = a.visiblePoll(c, p)
	c.JSON(200, gin.H{"success": true, "data": p})
}

func (a *App) optionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		if raw != "" {
			token, err := jwt.ParseWithClaims(raw, &claims{}, func(t *jwt.Token) (interface{}, error) { return a.jwtSecret, nil })
			if err == nil && token.Valid {
				if cl, ok := token.Claims.(*claims); ok {
					c.Set("userId", cl.UserID)
				}
			}
		}
		c.Next()
	}
}

func (a *App) visiblePoll(c *gin.Context, poll Poll) Poll {
	visibility := normalizeVisibility(poll.ResultVisibility)
	allowed := visibility == "ALWAYS_VISIBLE" || (visibility == "AFTER_CLOSED" && (poll.Status == "CLOSED" || poll.Status == "EXPIRED")) || (visibility == "CREATOR_ONLY" && c.GetString("userId") == poll.OwnerID)
	if visibility == "AFTER_VOTING" {
		var vote Vote
		if strings.TrimSpace(c.GetHeader("X-Voter-ID")) != "" {
			allowed = a.db.Collection("votes").FindOne(c, bson.M{"poll_id": poll.ID, "voter_id": strings.TrimSpace(c.GetHeader("X-Voter-ID"))}).Decode(&vote) == nil
		}
	}
	if !allowed {
		poll.TotalVotes = 0
		for index := range poll.Options {
			poll.Options[index].Votes = 0
		}
	}
	return poll
}

func (a *App) vote(c *gin.Context) {
	var in struct {
		OptionID  string   `json:"optionId"`
		OptionIDs []string `json:"optionIds"`
	}
	if !decode(c, &in) {
		return
	}
	voter := strings.TrimSpace(c.GetHeader("X-Voter-ID"))
	if len(voter) < 16 {
		fail(c, 400, "VOTER_ID_REQUIRED", "A voter identity is required")
		return
	}
	var p Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id")}).Decode(&p); err != nil {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	if p.Status == "CLOSED" {
		fail(c, 409, "POLL_CLOSED", "This poll is closed")
		return
	}
	if p.Status == "SCHEDULED" {
		fail(c, 409, "POLL_SCHEDULED", "This poll has not started yet")
		return
	}
	if p.ExpiresAt != nil && !p.ExpiresAt.After(time.Now()) {
		_, _ = a.db.Collection("polls").UpdateOne(c, bson.M{"_id": p.ID}, bson.M{"$set": bson.M{"status": "EXPIRED"}})
		fail(c, 409, "POLL_EXPIRED", "This poll has expired")
		return
	}
	if p.ChoiceType == "" {
		p.ChoiceType = "SINGLE"
	}
	selected := in.OptionIDs
	if len(selected) == 0 && in.OptionID != "" {
		selected = []string{in.OptionID}
	}
	if err := validateChoiceSelection(p.ChoiceType, selected, p.MaxSelections); err != nil {
		fail(c, 400, "VALIDATION_ERROR", err.Error())
		return
	}
	optionByID := map[string]struct{}{}
	for _, option := range p.Options {
		optionByID[option.ID] = struct{}{}
	}
	seen := map[string]bool{}
	for _, optionID := range selected {
		if _, ok := optionByID[optionID]; !ok {
			fail(c, 400, "INVALID_OPTION", "One of the selected options is not part of this poll")
			return
		}
		if seen[optionID] {
			fail(c, 400, "INVALID_OPTION", "Duplicate option selected")
			return
		}
		seen[optionID] = true
	}
	var existingVote Vote
	existingErr := a.db.Collection("votes").FindOne(c, bson.M{"poll_id": p.ID, "voter_id": voter}).Decode(&existingVote)
	if p.AllowVoteChange && existingErr == nil {
		previous := existingVote.OptionIDs
		if len(previous) == 0 && existingVote.OptionID != "" {
			previous = []string{existingVote.OptionID}
		}
		if sameSelections(previous, selected) {
			c.JSON(200, gin.H{"success": true, "data": p})
			return
		}
		for _, optionID := range previous {
			_, err := a.db.Collection("polls").UpdateOne(c, bson.M{"_id": p.ID, "options": bson.M{"$elemMatch": bson.M{"id": optionID, "votes": bson.M{"$gte": 1}}}}, bson.M{"$inc": bson.M{"options.$.votes": -1}, "$set": bson.M{"updated_at": time.Now()}})
			if err != nil {
				fail(c, 500, "DATABASE_ERROR", "Unable to update previous vote")
				return
			}
		}
		selectedLabels := make([]string, 0, len(selected))
		for _, optionID := range selected {
			for _, option := range p.Options {
				if option.ID == optionID {
					selectedLabels = append(selectedLabels, option.Text)
					break
				}
			}
		}
		if _, err := a.db.Collection("votes").UpdateOne(c, bson.M{"_id": existingVote.ID}, bson.M{"$set": bson.M{"option_id": selected[0], "option_ids": selected, "option_texts": selectedLabels, "updated_at": time.Now()}}); err != nil {
			fail(c, 500, "DATABASE_ERROR", "Unable to update vote")
			return
		}
	} else if existingErr == nil {
		fail(c, 409, "ALREADY_VOTED", "You have already voted in this poll")
		return
	}
	newResponse := !p.AllowVoteChange || existingErr != nil
	if newResponse {
		userID := c.GetString("userId")
		selectedLabels := make([]string, 0, len(selected))
		for _, optionID := range selected {
			for _, option := range p.Options {
				if option.ID == optionID {
					selectedLabels = append(selectedLabels, option.Text)
					break
				}
			}
		}
		v := Vote{ID: uuid.NewString(), PollID: p.ID, UserID: userID, Question: p.Question, OptionID: selected[0], OptionIDs: selected, OptionTexts: selectedLabels, VoterID: voter, CreatedAt: time.Now(), UpdatedAt: time.Now(), PollStatus: p.Status, CreatorUserID: p.OwnerID}
		if userID != "" {
			var creator User
			if err := a.db.Collection("users").FindOne(c, bson.M{"_id": p.OwnerID}).Decode(&creator); err == nil {
				v.CreatorName = creator.Name
			}
		}
		if _, err := a.db.Collection("votes").InsertOne(c, v); err != nil {
			if mongo.IsDuplicateKeyError(err) {
				fail(c, 409, "ALREADY_VOTED", "You have already voted in this poll")
				return
			}
			fail(c, 500, "DATABASE_ERROR", "Unable to record vote")
			return
		}
		limitFilter := bson.M{"_id": p.ID, "status": "ACTIVE"}
		if p.ResponseLimit > 0 {
			limitFilter["total_votes"] = bson.M{"$lt": p.ResponseLimit}
		}
		if p.AutoCloseAt > 0 {
			if p.ResponseLimit > 0 {
				limitFilter["total_votes"] = bson.M{"$lt": minInt64(p.ResponseLimit, p.AutoCloseAt)}
			} else {
				limitFilter["total_votes"] = bson.M{"$lt": p.AutoCloseAt}
			}
		}
		var reserved Poll
		if err := a.db.Collection("polls").FindOneAndUpdate(c, limitFilter, bson.M{"$inc": bson.M{"total_votes": 1}, "$set": bson.M{"updated_at": time.Now()}}, options.FindOneAndUpdate().SetReturnDocument(options.After)).Decode(&reserved); err != nil {
			_, _ = a.db.Collection("votes").DeleteOne(c, bson.M{"_id": v.ID})
			if p.ResponseLimit > 0 && p.TotalVotes >= p.ResponseLimit {
				fail(c, 409, "RESPONSE_LIMIT_REACHED", "This poll has reached its response limit")
			} else {
				fail(c, 409, "POLL_CLOSED", "This poll is no longer accepting responses")
			}
			return
		}
		if (reserved.AutoCloseAt > 0 && reserved.TotalVotes >= reserved.AutoCloseAt) || (reserved.ResponseLimit > 0 && reserved.TotalVotes >= reserved.ResponseLimit) {
			_, _ = a.db.Collection("polls").UpdateOne(c, bson.M{"_id": p.ID, "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "CLOSED", "updated_at": time.Now()}})
			_ = a.createNotification(c, p.OwnerID, "RESPONSE_LIMIT_REACHED", "Poll closed", "This poll has reached its response limit and is now closed.", p.ID, p.OwnerID, p.ID, bson.M{"responseLimit": p.ResponseLimit, "totalVotes": reserved.TotalVotes})
		}
	}
	for _, optionID := range selected {
		_, err := a.db.Collection("polls").UpdateOne(c, bson.M{"_id": p.ID, "options.id": optionID}, bson.M{"$inc": bson.M{"options.$.votes": 1}, "$set": bson.M{"updated_at": time.Now()}})
		if err != nil {
			fail(c, 500, "DATABASE_ERROR", "Unable to update results")
			return
		}
	}
	var updated Poll
	_ = a.db.Collection("polls").FindOne(c, bson.M{"_id": p.ID}).Decode(&updated)
	_ = a.createNotification(c, p.OwnerID, "VOTE_RECEIVED", "New vote", "Someone voted on your poll.", p.ID, voter, p.ID, bson.M{"pollQuestion": p.Question})
	if updated.Status == "CLOSED" {
		_ = a.createNotification(c, p.OwnerID, "POLL_CLOSED", "Poll closed", "Your poll has reached its closing condition and is now closed.", p.ID, p.OwnerID, p.ID, bson.M{"totalVotes": updated.TotalVotes})
	}
	payload, _ := json.Marshal(updated)
	if err := a.redis.Publish(c, "poll:"+p.ID+":updates", payload).Err(); err != nil {
		fail(c, 500, "REALTIME_ERROR", "Vote saved but live update could not be published")
		return
	}
	c.JSON(200, gin.H{"success": true, "data": updated})
}
func (a *App) stream(c *gin.Context) {
	var p Poll
	if err := a.db.Collection("polls").FindOne(c, bson.M{"_id": c.Param("id")}).Decode(&p); err != nil {
		fail(c, 404, "NOT_FOUND", "Poll not found")
		return
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")
	pubsub := a.redis.Subscribe(c, "poll:"+p.ID+":updates")
	defer pubsub.Close()
	c.SSEvent("results", p)
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
			c.SSEvent("results", json.RawMessage(msg.Payload))
			c.Writer.Flush()
		}
	}
}

func (a *App) auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
		token, err := jwt.ParseWithClaims(raw, &claims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("invalid signing method")
			}
			return a.jwtSecret, nil
		})
		if err != nil || !token.Valid {
			fail(c, 401, "UNAUTHORIZED", "Authentication is required")
			c.Abort()
			return
		}
		cl, ok := token.Claims.(*claims)
		if !ok {
			fail(c, 401, "UNAUTHORIZED", "Authentication is required")
			c.Abort()
			return
		}
		c.Set("userId", cl.UserID)
		c.Next()
	}
}
func (a *App) token(id string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims{UserID: id, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), IssuedAt: jwt.NewNumericDate(time.Now())}}).SignedString(a.jwtSecret)
}
func validatePoll(question string, values []string) (Poll, error) {
	question = strings.TrimSpace(question)
	if len(question) < 5 || len(question) > 240 {
		return Poll{}, errors.New("question must be between 5 and 240 characters")
	}
	if len(values) < 2 || len(values) > 10 {
		return Poll{}, errors.New("polls must have between 2 and 10 options")
	}
	seen := map[string]bool{}
	opts := make([]Option, 0, len(values))
	for _, value := range values {
		text := strings.TrimSpace(value)
		key := strings.ToLower(text)
		if len(text) < 1 || len(text) > 80 {
			return Poll{}, errors.New("options must be between 1 and 80 characters")
		}
		if seen[key] {
			return Poll{}, errors.New("options must be unique")
		}
		seen[key] = true
		opts = append(opts, Option{ID: uuid.NewString(), Text: text})
	}
	return Poll{Question: question, Options: opts}, nil
}
func normalizeChoiceType(raw string) (string, error) {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "", "SINGLE":
		return "SINGLE", nil
	case "MULTIPLE":
		return "MULTIPLE", nil
	default:
		return "", errors.New("choiceType must be SINGLE or MULTIPLE")
	}
}
func validateChoiceTypeSettings(choiceType string, maxSelections int) error {
	switch strings.ToUpper(choiceType) {
	case "SINGLE":
		return nil
	case "MULTIPLE":
		if maxSelections < 0 {
			return errors.New("maxSelections must be zero or greater")
		}
		if maxSelections == 1 {
			return errors.New("multiple choice must allow at least 2 selections or no cap")
		}
		return nil
	case "EXACTLY_TWO":
		if maxSelections != 0 && maxSelections != 2 {
			return errors.New("exactly-two polls must allow exactly 2 selections")
		}
		return nil
	default:
		return errors.New("choiceType must be SINGLE or MULTIPLE")
	}
}
func validateChoiceSelection(choiceType string, selected []string, maxSelections int) error {
	normalized := strings.ToUpper(strings.TrimSpace(choiceType))
	if normalized != "EXACTLY_TWO" {
		var err error
		normalized, err = normalizeChoiceType(choiceType)
		if err != nil {
			return err
		}
	}
	switch normalized {
	case "SINGLE":
		if len(selected) != 1 {
			return errors.New("Select exactly 1 option.")
		}
		return nil
	case "MULTIPLE":
		if len(selected) < 1 {
			return errors.New("Select at least 1 option.")
		}
		if maxSelections > 0 && len(selected) > maxSelections {
			return errors.New("Select no more than " + strconv.Itoa(maxSelections) + " options.")
		}
		return nil
	case "EXACTLY_TWO":
		if len(selected) != 2 {
			return errors.New("Select exactly 2 options.")
		}
		return nil
	default:
		return errors.New("invalid choice type")
	}
}
func (a *App) syncPollLifecycle(ctx context.Context, poll *Poll) {
	if poll == nil {
		return
	}
	if poll.Status == "SCHEDULED" && poll.StartAt != nil && !poll.StartAt.After(time.Now()) {
		poll.Status = "ACTIVE"
		_, _ = a.db.Collection("polls").UpdateOne(ctx, bson.M{"_id": poll.ID, "status": "SCHEDULED"}, bson.M{"$set": bson.M{"status": "ACTIVE", "updated_at": time.Now()}})
		_ = a.createNotification(ctx, poll.OwnerID, "POLL_ACTIVATED", "Poll activated", "Your scheduled poll is now live.", poll.ID, poll.OwnerID, poll.ID, bson.M{"startedAt": poll.StartAt})
	}
	if poll.Status == "ACTIVE" && poll.ExpiresAt != nil && !poll.ExpiresAt.After(time.Now()) {
		poll.Status = "EXPIRED"
		_, _ = a.db.Collection("polls").UpdateOne(ctx, bson.M{"_id": poll.ID, "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "EXPIRED", "updated_at": time.Now()}})
		_ = a.createNotification(ctx, poll.OwnerID, "POLL_EXPIRED", "Poll expired", "Your poll has expired and is no longer accepting votes.", poll.ID, poll.OwnerID, poll.ID, bson.M{"expiredAt": poll.ExpiresAt})
	}
	if poll.Status == "ACTIVE" && poll.TotalVotes > 0 {
		if poll.ResponseLimit > 0 && poll.TotalVotes >= poll.ResponseLimit {
			poll.Status = "CLOSED"
			_, _ = a.db.Collection("polls").UpdateOne(ctx, bson.M{"_id": poll.ID, "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "CLOSED", "updated_at": time.Now()}})
			_ = a.createNotification(ctx, poll.OwnerID, "RESPONSE_LIMIT_REACHED", "Poll closed", "This poll reached its response limit and closed automatically.", poll.ID, poll.OwnerID, poll.ID, bson.M{"responseLimit": poll.ResponseLimit, "totalVotes": poll.TotalVotes})
		}
		if poll.AutoCloseAt > 0 && poll.TotalVotes >= poll.AutoCloseAt {
			poll.Status = "CLOSED"
			_, _ = a.db.Collection("polls").UpdateOne(ctx, bson.M{"_id": poll.ID, "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "CLOSED", "updated_at": time.Now()}})
			_ = a.createNotification(ctx, poll.OwnerID, "POLL_CLOSED", "Poll closed", "This poll closed after reaching its configured response limit.", poll.ID, poll.OwnerID, poll.ID, bson.M{"autoCloseAt": poll.AutoCloseAt, "totalVotes": poll.TotalVotes})
		}
	}
}

func (a *App) markExpired(ctx context.Context, poll *Poll) {
	if poll.Status == "ACTIVE" && poll.ExpiresAt != nil && !poll.ExpiresAt.After(time.Now()) {
		poll.Status = "EXPIRED"
		_, _ = a.db.Collection("polls").UpdateOne(ctx, bson.M{"_id": poll.ID, "status": "ACTIVE"}, bson.M{"$set": bson.M{"status": "EXPIRED", "updated_at": time.Now()}})
	}
}
func preserveOptionResults(current, edited []Option) ([]Option, error) {
	if len(edited) < len(current) {
		for _, option := range current[:len(edited)] {
			if option.Votes > 0 {
				return nil, errors.New("options with votes cannot be removed")
			}
		}
		for _, option := range current[len(edited):] {
			if option.Votes > 0 {
				return nil, errors.New("options with votes cannot be removed")
			}
		}
	}
	for index := range edited {
		if index < len(current) {
			edited[index].ID = current[index].ID
			edited[index].Votes = current[index].Votes
		}
	}
	return edited, nil
}
func decode(c *gin.Context, dst interface{}) bool {
	if c.Request.Body == nil {
		fail(c, 400, "INVALID_JSON", "A request body is required")
		return false
	}
	if err := c.ShouldBindJSON(dst); err != nil {
		fail(c, 400, "INVALID_JSON", "Request body is invalid")
		return false
	}
	return true
}
func fail(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"success": false, "error": gin.H{"code": code, "message": message}})
}
func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
func splitOrigins(value string) []string {
	result := []string{}
	for _, item := range strings.Split(value, ",") {
		if strings.TrimSpace(item) != "" {
			result = append(result, strings.TrimSpace(item))
		}
	}
	return result
}
func sameSelections(left, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	counts := map[string]int{}
	for _, value := range left {
		counts[value]++
	}
	for _, value := range right {
		counts[value]--
		if counts[value] < 0 {
			return false
		}
	}
	for _, count := range counts {
		if count != 0 {
			return false
		}
	}
	return true
}
func sameOptions(left, right []Option) bool {
	if len(left) != len(right) {
		return false
	}
	for index := range left {
		if left[index].Text != right[index].Text || left[index].Votes != right[index].Votes {
			return false
		}
	}
	return true
}
func newVoterID() string {
	bytes := make([]byte, 16)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

var _ = newVoterID

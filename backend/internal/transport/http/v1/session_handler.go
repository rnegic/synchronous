package v1

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rnegic/synchronous/internal/entity"
	"github.com/rnegic/synchronous/internal/interfaces"
)

type SessionHandler struct {
	*BaseHandler
	sessionService     interfaces.SessionService
	messageService     interfaces.MessageService
	leaderboardService interfaces.LeaderboardService
}

func NewSessionHandler(
	baseHandler *BaseHandler,
	sessionService interfaces.SessionService,
	messageService interfaces.MessageService,
	leaderboardService interfaces.LeaderboardService,
) *SessionHandler {
	return &SessionHandler{
		BaseHandler:        baseHandler,
		sessionService:     sessionService,
		messageService:     messageService,
		leaderboardService: leaderboardService,
	}
}

func (h *SessionHandler) RegisterRoutes(router *gin.RouterGroup) {
	sessions := router.Group("/sessions")
	{
		// Список сессий и создание
		sessions.GET("", h.getHistory)
		sessions.GET("/public", h.getPublicSessions)
		sessions.POST("", h.createSession)
		sessions.GET("/active", h.getActiveSession)

		// Сессия по ID
		session := sessions.Group("/:sessionId")
		{
			session.GET("", h.getSession)
			session.POST("/join", h.joinSession)
			session.PATCH("/ready", h.setReady)
			session.POST("/start", h.startSession)
			session.POST("/complete", h.completeSession)

			// Чат
			session.GET("/chat", h.getChatInfo)
			session.DELETE("/chat", h.deleteChat)

			// Задачи
			session.POST("/tasks", h.addTask)
			session.PATCH("/tasks/:taskId", h.updateTask)
			session.DELETE("/tasks/:taskId", h.deleteTask)

			// Сообщения
			session.GET("/messages", h.getMessages)
			session.POST("/messages", h.sendMessage)

			// Лидерборд
			session.GET("/leaderboard", h.getSessionLeaderboard)
		}
	}

	// Глобальный лидерборд
	router.GET("/leaderboard/global", h.getGlobalLeaderboard)
}

// createSession создает новую сессию
func (h *SessionHandler) createSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req struct {
		Mode          string   `json:"mode" binding:"required"`
		Tasks         []string `json:"tasks" binding:"required"`
		FocusDuration int      `json:"focusDuration" binding:"required"`
		BreakDuration int      `json:"breakDuration" binding:"required"`
		GroupName     *string  `json:"groupName"`
		IsPrivate     bool     `json:"isPrivate"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	mode := entity.SessionMode(req.Mode)
	if mode != entity.SessionModeSolo && mode != entity.SessionModeGroup {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid mode: must be 'solo' or 'group'")
		return
	}

	session, err := h.sessionService.CreateSession(
		userID,
		mode,
		req.Tasks,
		req.FocusDuration,
		req.BreakDuration,
		req.GroupName,
		req.IsPrivate,
	)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"session": h.sessionToMap(session),
	})
}

// getHistory возвращает историю сессий
func (h *SessionHandler) getHistory(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	sessions, total, err := h.sessionService.GetHistory(userID, page, limit)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	sessionsList := make([]gin.H, 0, len(sessions))
	for _, session := range sessions {
		sessionsList = append(sessionsList, h.sessionToMap(session))
	}

	hasNext := (page * limit) < total

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"sessions": sessionsList,
		"pagination": gin.H{
			"page":    page,
			"limit":   limit,
			"total":   total,
			"hasNext": hasNext,
		},
	})
}


// getPublicSessions возвращает список публичных сессий
func (h *SessionHandler) getPublicSessions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	sessions, total, err := h.sessionService.GetPublicSessions(page, limit)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	sessionsList := make([]gin.H, 0, len(sessions))
	for _, session := range sessions {
		sessionsList = append(sessionsList, h.sessionToMap(session))
	}

	hasNext := (page * limit) < total

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"sessions": sessionsList,
		"pagination": gin.H{
			"page":    page,
			"limit":   limit,
			"total":   total,
			"hasNext": hasNext,
		},
	})
}

// getActiveSession возвращает активную сессию
func (h *SessionHandler) getActiveSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	session, err := h.sessionService.GetActiveSession(userID)
	if err != nil {
		h.ErrorResponse(c, http.StatusNotFound, err.Error())
		return
	}

	h.SuccessResponse(c, http.StatusOK, h.sessionToMap(session))
}

// getSession возвращает детали сессии
func (h *SessionHandler) getSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")
	if sessionID == "" {
		h.ErrorResponse(c, http.StatusBadRequest, "session ID is required")
		return
	}

	session, err := h.sessionService.GetSession(sessionID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else if strings.Contains(err.Error(), "access denied") {
			h.ErrorResponse(c, http.StatusForbidden, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"session": h.sessionToMap(session),
	})
}

// joinSession присоединяет пользователя к сессии
func (h *SessionHandler) joinSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")
	session, err := h.sessionService.JoinSession(sessionID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "already started") {
			h.ErrorResponse(c, http.StatusBadRequest, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"session": h.sessionToMap(session),
	})
}

// setReady отмечает готовность участника
func (h *SessionHandler) setReady(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	var req struct {
		IsReady bool `json:"isReady" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.sessionService.SetReady(sessionID, userID, req.IsReady); err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.Status(http.StatusOK)
}

// startSession начинает сессию
func (h *SessionHandler) startSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	if err := h.sessionService.StartSession(sessionID, userID); err != nil {
		if strings.Contains(err.Error(), "only creator") {
			h.ErrorResponse(c, http.StatusForbidden, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	// Получаем обновленную сессию
	session, err := h.sessionService.GetSession(sessionID, userID)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"session": gin.H{
			"id":        session.ID,
			"status":    session.Status,
			"startedAt": session.StartedAt.Format(time.RFC3339),
		},
	})
}

// completeSession завершает сессию
func (h *SessionHandler) completeSession(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	report, err := h.sessionService.CompleteSession(sessionID, userID)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	participantsList := make([]gin.H, 0, len(report.Participants))
	for _, p := range report.Participants {
		participantsList = append(participantsList, gin.H{
			"userId":         p.UserID,
			"userName":       p.UserName,
			"avatarUrl":      p.AvatarURL,
			"tasksCompleted": p.TasksCompleted,
			"focusTime":      p.FocusTime,
		})
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"report": gin.H{
			"sessionId":       report.SessionID,
			"tasksCompleted":  report.TasksCompleted,
			"tasksTotal":      report.TasksTotal,
			"focusTime":       report.FocusTime,
			"breakTime":       report.BreakTime,
			"cyclesCompleted": report.CyclesCompleted,
			"participants":    participantsList,
			"completedAt":     report.CompletedAt.Format(time.RFC3339),
		},
	})
}

// sessionToMap конвертирует сессию в map для JSON ответа
func (h *SessionHandler) sessionToMap(session *entity.Session) gin.H {
	tasksList := make([]gin.H, 0, len(session.Tasks))
	for _, task := range session.Tasks {
		taskMap := gin.H{
			"id":        task.ID,
			"title":     task.Title,
			"completed": task.Completed,
			"createdAt": task.CreatedAt.Format(time.RFC3339),
		}
		if task.CompletedAt != nil {
			taskMap["completedAt"] = task.CompletedAt.Format(time.RFC3339)
		}
		tasksList = append(tasksList, taskMap)
	}

	participantsList := make([]gin.H, 0, len(session.Participants))
	for _, p := range session.Participants {
		participantMap := gin.H{
			"userId":   p.UserID,
			"userName": p.UserName,
			"isReady":  p.IsReady,
			"joinedAt": p.JoinedAt.Format(time.RFC3339),
		}
		if p.AvatarURL != nil {
			participantMap["avatarUrl"] = *p.AvatarURL
		}
		participantsList = append(participantsList, participantMap)
	}

	sessionMap := gin.H{
		"id":            session.ID,
		"mode":          session.Mode,
		"status":        session.Status,
		"tasks":         tasksList,
		"focusDuration": session.FocusDuration,
		"breakDuration": session.BreakDuration,
		"isPrivate":     session.IsPrivate,
		"creatorId":     session.CreatorID,
		"participants":  participantsList,
		"inviteLink":    session.InviteLink,
		"createdAt":     session.CreatedAt.Format(time.RFC3339),
		"currentCycle":  session.CurrentCycle,
	}

	if session.GroupName != nil {
		sessionMap["groupName"] = *session.GroupName
	}
	if session.StartedAt != nil {
		sessionMap["startedAt"] = session.StartedAt.Format(time.RFC3339)
	}
	if session.CompletedAt != nil {
		sessionMap["completedAt"] = session.CompletedAt.Format(time.RFC3339)
	}
	if session.MaxChatID != nil {
		sessionMap["maxChatId"] = *session.MaxChatID
	}
	if session.MaxChatLink != nil {
		sessionMap["maxChatLink"] = *session.MaxChatLink
	}

	return sessionMap
}

// addTask добавляет задачу
func (h *SessionHandler) addTask(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	var req struct {
		Title string `json:"title" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid request body")
		return
	}

	task, err := h.sessionService.AddTask(sessionID, userID, req.Title)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"task": gin.H{
			"id":        task.ID,
			"title":     task.Title,
			"completed": task.Completed,
			"createdAt": task.CreatedAt.Format(time.RFC3339),
		},
	})
}

// updateTask обновляет задачу
func (h *SessionHandler) updateTask(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")
	taskID := c.Param("taskId")

	var req struct {
		Completed bool `json:"completed" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid request body")
		return
	}

	task, err := h.sessionService.UpdateTask(sessionID, taskID, userID, req.Completed)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	taskMap := gin.H{
		"id":        task.ID,
		"title":     task.Title,
		"completed": task.Completed,
		"createdAt": task.CreatedAt.Format(time.RFC3339),
	}
	if task.CompletedAt != nil {
		taskMap["completedAt"] = task.CompletedAt.Format(time.RFC3339)
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"task": taskMap,
	})
}

// deleteTask удаляет задачу
func (h *SessionHandler) deleteTask(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")
	taskID := c.Param("taskId")

	if err := h.sessionService.DeleteTask(sessionID, taskID, userID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// getMessages получает сообщения
func (h *SessionHandler) getMessages(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var before *time.Time
	if beforeStr := c.Query("before"); beforeStr != "" {
		if timestamp, err := strconv.ParseInt(beforeStr, 10, 64); err == nil {
			t := time.Unix(timestamp/1000, (timestamp%1000)*1000000)
			before = &t
		}
	}

	messages, err := h.messageService.GetMessages(sessionID, userID, before, limit)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "chat") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	messagesList := make([]gin.H, 0, len(messages))
	for _, msg := range messages {
		msgMap := gin.H{
			"id":        msg.ID,
			"userId":    msg.UserID,
			"userName":  msg.UserName,
			"text":      msg.Text,
			"createdAt": msg.CreatedAt.Format(time.RFC3339),
		}
		if msg.AvatarURL != nil {
			msgMap["avatarUrl"] = *msg.AvatarURL
		}
		messagesList = append(messagesList, msgMap)
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"messages": messagesList,
	})
}

// sendMessage отправляет сообщение
func (h *SessionHandler) sendMessage(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	var req struct {
		Text string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		h.ErrorResponse(c, http.StatusBadRequest, "invalid request body")
		return
	}

	message, err := h.messageService.SendMessage(sessionID, userID, req.Text)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "chat") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	msgMap := gin.H{
		"id":        message.ID,
		"userId":    message.UserID,
		"userName":  message.UserName,
		"text":      message.Text,
		"createdAt": message.CreatedAt.Format(time.RFC3339),
	}
	if message.AvatarURL != nil {
		msgMap["avatarUrl"] = *message.AvatarURL
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"message": msgMap,
	})
}

// getChatInfo возвращает информацию о чате
func (h *SessionHandler) getChatInfo(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	chatInfo, err := h.messageService.GetChatInfo(sessionID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "chat") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"chatId":            chatInfo.ChatID,
		"chatLink":          chatInfo.ChatLink,
		"title":             chatInfo.Title,
		"participantsCount": chatInfo.ParticipantsCount,
	})
}

// deleteChat удаляет чат после обсуждения
func (h *SessionHandler) deleteChat(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	if err := h.sessionService.DeleteChatAfterDiscussion(sessionID, userID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			h.ErrorResponse(c, http.StatusNotFound, err.Error())
		} else if strings.Contains(err.Error(), "only creator") {
			h.ErrorResponse(c, http.StatusForbidden, err.Error())
		} else {
			h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// getSessionLeaderboard возвращает лидерборд сессии
func (h *SessionHandler) getSessionLeaderboard(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	sessionID := c.Param("sessionId")

	entries, err := h.leaderboardService.GetSessionLeaderboard(sessionID, userID)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	entriesList := make([]gin.H, 0, len(entries))
	for _, entry := range entries {
		entryMap := gin.H{
			"rank":           entry.Rank,
			"userId":         entry.UserID,
			"userName":       entry.UserName,
			"tasksCompleted": entry.TasksCompleted,
			"focusTime":      entry.FocusTime,
			"score":          entry.Score,
		}
		if entry.AvatarURL != nil {
			entryMap["avatarUrl"] = *entry.AvatarURL
		}
		entriesList = append(entriesList, entryMap)
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"leaderboard": entriesList,
	})
}

// getGlobalLeaderboard возвращает глобальный лидерборд
func (h *SessionHandler) getGlobalLeaderboard(c *gin.Context) {
	userID := h.GetUserID(c)
	if userID == "" {
		h.ErrorResponse(c, http.StatusUnauthorized, "unauthorized")
		return
	}

	periodStr := c.DefaultQuery("period", "week")
	period := entity.LeaderboardPeriod(periodStr)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	entries, err := h.leaderboardService.GetGlobalLeaderboard(userID, period, limit)
	if err != nil {
		h.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	entriesList := make([]gin.H, 0, len(entries))
	for _, entry := range entries {
		entryMap := gin.H{
			"rank":           entry.Rank,
			"userId":         entry.UserID,
			"userName":       entry.UserName,
			"tasksCompleted": entry.TasksCompleted,
			"focusTime":      entry.FocusTime,
			"score":          entry.Score,
		}
		if entry.AvatarURL != nil {
			entryMap["avatarUrl"] = *entry.AvatarURL
		}
		entriesList = append(entriesList, entryMap)
	}

	h.SuccessResponse(c, http.StatusOK, gin.H{
		"leaderboard": entriesList,
	})
}

package v1

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rnegic/synchronous/internal/interfaces"
	"github.com/rnegic/synchronous/pkg/maxapi"
)

type WebhookHandler struct {
	*BaseHandler
	sessionService interfaces.SessionService
}

func NewWebhookHandler(baseHandler *BaseHandler, sessionService interfaces.SessionService) *WebhookHandler {
	return &WebhookHandler{
		BaseHandler:    baseHandler,
		sessionService: sessionService,
	}
}

func (h *WebhookHandler) RegisterRoutes(router *gin.RouterGroup) {
	// Webhook endpoint (публичный, без аутентификации)
	router.POST("/webhook/max", h.handleWebhook)
}

// handleWebhook обрабатывает webhook от Max API
func (h *WebhookHandler) handleWebhook(c *gin.Context) {
	// Читаем тело запроса
	body, err := c.GetRawData()
	if err != nil {
		log.Printf("[Webhook] Failed to read request body: %v", err)
		h.ErrorResponse(c, http.StatusBadRequest, "failed to read request body")
		return
	}

	// Парсим обновление
	update, err := maxapi.ParseUpdate(body)
	if err != nil {
		log.Printf("[Webhook] Failed to parse update: %v", err)
		h.ErrorResponse(c, http.StatusBadRequest, "failed to parse update")
		return
	}

	// Обрабатываем обновление в зависимости от типа
	switch u := update.(type) {
	case *maxapi.MessageChatCreatedUpdate:
		// Обрабатываем создание чата
		log.Printf("[Webhook] Received chat created update: chatID=%d, startPayload=%s",
			u.Chat.ChatID, u.StartPayload)

		if err := h.sessionService.HandleChatCreated(update); err != nil {
			log.Printf("[Webhook] Failed to handle chat created: %v", err)
			h.ErrorResponse(c, http.StatusInternalServerError, "failed to process chat creation")
			return
		}

		log.Printf("[Webhook] ✅ Chat created successfully: chatID=%d", u.Chat.ChatID)
		h.SuccessResponse(c, http.StatusOK, gin.H{"status": "processed"})

	default:
		// Другие типы обновлений пока не обрабатываем
		log.Printf("[Webhook] Received unhandled update type: %T", update)
		h.SuccessResponse(c, http.StatusOK, gin.H{"status": "ignored"})
	}
}

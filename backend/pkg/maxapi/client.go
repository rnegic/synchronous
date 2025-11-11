package maxapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"time"
	"unsafe"

	maxbot "github.com/max-messenger/max-bot-api-client-go"
	"github.com/max-messenger/max-bot-api-client-go/configservice"
	"github.com/max-messenger/max-bot-api-client-go/schemes"
)

const defaultAPIURL = "https://botapi.max.ru"

var _ configservice.ConfigInterface = (*simpleConfig)(nil)

type simpleConfig struct {
	baseURL string
	timeout int
	token   string
}

func (c *simpleConfig) GetHttpBotAPIUrl() string {
	if c.baseURL == "" {
		return defaultAPIURL
	}
	return c.baseURL
}

func (c *simpleConfig) GetHttpBotAPITimeOut() int {
	if c.timeout <= 0 {
		return 30
	}
	return c.timeout
}

func (c *simpleConfig) GetHttpBotAPIVersion() string    { return "" }
func (c *simpleConfig) BotTokenCheckInInputSteam() bool { return false }
func (c *simpleConfig) BotTokenCheckString() string     { return c.token }
func (c *simpleConfig) GetDebugLogMode() bool           { return false }
func (c *simpleConfig) GetDebugLogChat() int64          { return 0 }

type Client struct {
	api         *maxbot.Api
	baseURL     string
	accessToken string
	httpClient  *http.Client
}

type BotInfo struct {
	UserID        int64  `json:"user_id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name,omitempty"`
	Name          string `json:"name,omitempty"`
	Username      string `json:"username,omitempty"`
	IsBot         bool   `json:"is_bot"`
	AvatarURL     string `json:"avatar_url,omitempty"`
	FullAvatarURL string `json:"full_avatar_url,omitempty"`
	Description   string `json:"description,omitempty"`
}

type MaxUser struct {
	UserID    int64  `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username,omitempty"`
	IsBot     bool   `json:"is_bot"`
	AvatarURL string `json:"avatar_url,omitempty"`
	Name      string `json:"name,omitempty"`
}

type Chat struct {
	ChatID            int64  `json:"chat_id"`
	Type              string `json:"type"`
	Status            string `json:"status"`
	Title             string `json:"title,omitempty"`
	LastEventTime     int64  `json:"last_event_time"`
	ParticipantsCount int    `json:"participants_count"`
}

type Message struct {
	Sender struct {
		UserID    int64  `json:"user_id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name,omitempty"`
		Username  string `json:"username,omitempty"`
	} `json:"sender"`
	Recipient struct {
		ChatID   int64  `json:"chat_id"`
		UserID   int64  `json:"user_id"`
		ChatType string `json:"chat_type"`
	} `json:"recipient"`
	Timestamp int64 `json:"timestamp"`
	Body      struct {
		Mid         string        `json:"mid"`
		Text        string        `json:"text,omitempty"`
		Attachments []interface{} `json:"attachments,omitempty"`
	} `json:"body"`
}

type SendMessageRequest struct {
	Text        string        `json:"text,omitempty"`
	Attachments []interface{} `json:"attachments,omitempty"`
}

type SendMessageResponse struct {
	Message Message `json:"message"`
}

type ChatMember struct {
	UserID         int64    `json:"user_id"`
	FirstName      string   `json:"first_name"`
	LastName       string   `json:"last_name,omitempty"`
	Username       string   `json:"username,omitempty"`
	IsBot          bool     `json:"is_bot"`
	AvatarURL      string   `json:"avatar_url,omitempty"`
	LastAccessTime int64    `json:"last_access_time"`
	IsOwner        bool     `json:"is_owner"`
	IsAdmin        bool     `json:"is_admin"`
	JoinTime       int64    `json:"join_time"`
	Permissions    []string `json:"permissions,omitempty"`
	Alias          string   `json:"alias,omitempty"`
}

type ChatMembersResponse struct {
	Members []ChatMember `json:"members"`
	Marker  *int64       `json:"marker,omitempty"`
}

type chatButton struct {
	schemes.Button
	ChatTitle       string `json:"chat_title,omitempty"`
	ChatDescription string `json:"chat_description,omitempty"`
	StartPayload    string `json:"start_payload,omitempty"`
	UUID            string `json:"uuid,omitempty"`
}

func NewClient(baseURL, accessToken string) (*Client, error) {
	cfg := &simpleConfig{
		baseURL: baseURL,
		timeout: 30,
		token:   accessToken,
	}

	api, err := maxbot.NewWithConfig(cfg)
	if err != nil {
		return nil, err
	}

	return &Client{
		api:         api,
		baseURL:     cfg.GetHttpBotAPIUrl(),
		accessToken: accessToken,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

func (c *Client) GetMyInfo() (*BotInfo, error) {
	ctx := context.Background()
	info, err := c.api.Bots.GetBot(ctx)
	if err != nil {
		return nil, err
	}

	return convertBotInfo(info), nil
}

func (c *Client) SendMessage(chatID int64, message *SendMessageRequest) (*SendMessageResponse, error) {
	ctx := context.Background()

	msg := maxbot.NewMessage().SetChat(chatID)
	if message != nil {
		msg.SetText(message.Text)
	}

	sent, err := c.api.Messages.SendMessageResult(ctx, msg)
	if err != nil {
		return nil, err
	}

	return &SendMessageResponse{Message: convertMessage(sent)}, nil
}

func (c *Client) SendMessageToUser(userID int64, message *SendMessageRequest) (*SendMessageResponse, error) {
	ctx := context.Background()
	msg := maxbot.NewMessage().SetUser(userID)
	if message != nil {
		msg.SetText(message.Text)
		if len(message.Attachments) > 0 {
			for _, attachment := range message.Attachments {
				if err := appendAttachment(msg, attachment); err != nil {
					return nil, err
				}
			}
		}
	}

	sent, err := c.api.Messages.SendMessageResult(ctx, msg)
	if err != nil {
		return nil, err
	}

	return &SendMessageResponse{Message: convertMessage(sent)}, nil
}

func (c *Client) GetChat(chatID int64) (*Chat, error) {
	ctx := context.Background()
	chat, err := c.api.Chats.GetChat(ctx, chatID)
	if err != nil {
		return nil, err
	}

	return convertChat(chat), nil
}

func (c *Client) GetChatByLink(chatLink string) (*Chat, error) {
	endpoint := fmt.Sprintf("/chats/%s", url.PathEscape(chatLink))
	var chat Chat
	if err := c.doRequest("GET", endpoint, nil, &chat); err != nil {
		return nil, err
	}

	return &chat, nil
}

func (c *Client) GetMessages(chatID int64, from, to, count *int64, messageIDs []string) ([]Message, error) {
	ctx := context.Background()

	var fromInt, toInt, countInt int
	if from != nil {
		fromInt = int(*from)
	}
	if to != nil {
		toInt = int(*to)
	}
	if count != nil {
		countInt = int(*count)
	}

	list, err := c.api.Messages.GetMessages(ctx, chatID, messageIDs, fromInt, toInt, countInt)
	if err != nil {
		return nil, err
	}

	result := make([]Message, 0, len(list.Messages))
	for _, msg := range list.Messages {
		result = append(result, convertMessage(msg))
	}

	return result, nil
}

func (c *Client) AddMembers(chatID int64, userIDs []int64) error {
	ctx := context.Background()
	intIDs := make([]int, 0, len(userIDs))
	for _, id := range userIDs {
		intIDs = append(intIDs, int(id))
	}

	_, err := c.api.Chats.AddMember(ctx, chatID, schemes.UserIdsList{UserIds: intIDs})
	return err
}

func (c *Client) GetChatMembers(chatID int64, marker *int64, count *int, userIDs []int64) (*ChatMembersResponse, error) {
	ctx := context.Background()

	var markerVal, countVal int64
	if marker != nil {
		markerVal = *marker
	}
	if count != nil {
		countVal = int64(*count)
	}

	list, err := c.api.Chats.GetChatMembers(ctx, chatID, countVal, markerVal)
	if err != nil {
		return nil, err
	}

	resp := &ChatMembersResponse{
		Members: make([]ChatMember, 0, len(list.Members)),
	}

	for _, member := range list.Members {
		resp.Members = append(resp.Members, convertChatMember(member))
	}

	if list.Marker != nil {
		val := int64(*list.Marker)
		resp.Marker = &val
	}

	return resp, nil
}

func (c *Client) EditChat(chatID int64, title *string, icon interface{}) (*Chat, error) {
	ctx := context.Background()
	update := &schemes.ChatPatch{}
	if title != nil {
		update.Title = *title
	}

	chat, err := c.api.Chats.EditChat(ctx, chatID, update)
	if err != nil {
		return nil, err
	}

	return convertChat(chat), nil
}

func (c *Client) DeleteChat(chatID int64) error {
	endpoint := fmt.Sprintf("/chats/%d", chatID)
	return c.doRequest("DELETE", endpoint, nil, nil)
}

func (c *Client) RemoveMember(chatID int64, userID int64) error {
	ctx := context.Background()
	_, err := c.api.Chats.RemoveMember(ctx, chatID, userID)
	return err
}

// --- Helpers ----------------------------------------------------------------

func convertBotInfo(info *schemes.BotInfo) *BotInfo {
	if info == nil {
		return nil
	}

	firstName, lastName := splitName(info.Name)

	return &BotInfo{
		UserID:        info.UserId,
		FirstName:     firstName,
		LastName:      lastName,
		Name:          info.Name,
		Username:      info.Username,
		IsBot:         true,
		AvatarURL:     info.AvatarUrl,
		FullAvatarURL: info.FullAvatarUrl,
		Description:   info.Description,
	}
}

func convertChat(chat *schemes.Chat) *Chat {
	if chat == nil {
		return nil
	}

	return &Chat{
		ChatID:            chat.ChatId,
		Type:              string(chat.Type),
		Status:            string(chat.Status),
		Title:             chat.Title,
		LastEventTime:     int64(chat.LastEventTime),
		ParticipantsCount: chat.ParticipantsCount,
	}
}

func convertChatMember(member schemes.ChatMember) ChatMember {
	return ChatMember{
		UserID:         member.UserId,
		FirstName:      member.Name,
		LastName:       "",
		Username:       member.Username,
		IsBot:          false,
		AvatarURL:      member.AvatarUrl,
		LastAccessTime: int64(member.LastAccessTime),
		IsOwner:        member.IsOwner,
		IsAdmin:        member.IsAdmin,
		JoinTime:       int64(member.JoinTime),
		Permissions:    convertPermissions(member.Permissions),
		Alias:          "",
	}
}

func convertPermissions(perms []schemes.ChatAdminPermission) []string {
	if len(perms) == 0 {
		return nil
	}
	res := make([]string, 0, len(perms))
	for _, p := range perms {
		res = append(res, string(p))
	}
	return res
}

func convertMessage(msg schemes.Message) Message {
	var result Message

	result.Sender.UserID = msg.Sender.UserId
	result.Sender.FirstName = msg.Sender.FirstName
	result.Sender.LastName = msg.Sender.LastName
	result.Sender.Username = msg.Sender.Username

	result.Recipient.ChatID = msg.Recipient.ChatId
	result.Recipient.UserID = msg.Recipient.UserId
	result.Recipient.ChatType = string(msg.Recipient.ChatType)

	result.Timestamp = msg.Timestamp
	result.Body.Mid = msg.Body.Mid
	result.Body.Text = msg.Body.Text

	return result
}

func appendAttachment(msg *maxbot.Message, attachment interface{}) error {
	switch att := attachment.(type) {
	case map[string]interface{}:
		attType := fmt.Sprint(att["type"])
		if attType == "inline_keyboard" {
			payload, ok := att["payload"].(map[string]interface{})
			if !ok {
				return fmt.Errorf("invalid inline keyboard payload")
			}

			keyboardAttachment, err := buildInlineKeyboardAttachment(payload)
			if err != nil {
				return err
			}
			return setMessageAttachment(msg, keyboardAttachment)
		}
	}

	return setMessageAttachment(msg, attachment)
}

func buildInlineKeyboardAttachment(payload map[string]interface{}) (*schemes.InlineKeyboardAttachmentRequest, error) {
	rowsRaw, ok := payload["buttons"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid keyboard buttons format")
	}

	rows := make([][]schemes.ButtonInterface, 0, len(rowsRaw))
	for _, rowRaw := range rowsRaw {
		buttonsRaw, ok := rowRaw.([]interface{})
		if !ok {
			return nil, fmt.Errorf("invalid keyboard row format")
		}

		row := make([]schemes.ButtonInterface, 0, len(buttonsRaw))
		for _, buttonRaw := range buttonsRaw {
			btnMap, ok := buttonRaw.(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("invalid keyboard button format")
			}

			btnType := fmt.Sprint(btnMap["type"])
			text := fmt.Sprint(btnMap["text"])

			switch btnType {
			case "chat":
				row = append(row, chatButton{
					Button: schemes.Button{
						Text: text,
						Type: schemes.ButtonType(btnType),
					},
					ChatTitle:       toString(btnMap["chat_title"]),
					ChatDescription: toString(btnMap["chat_description"]),
					StartPayload:    toString(btnMap["start_payload"]),
					UUID:            toString(btnMap["uuid"]),
				})
			case "link":
				row = append(row, schemes.LinkButton{
					Url: toString(btnMap["url"]),
					Button: schemes.Button{
						Text: text,
						Type: schemes.LINK,
					},
				})
			case "callback":
				row = append(row, schemes.CallbackButton{
					Payload: toString(btnMap["payload"]),
					Intent:  schemes.Intent(toString(btnMap["intent"])),
					Button: schemes.Button{
						Text: text,
						Type: schemes.CALLBACK,
					},
				})
			default:
				row = append(row, schemes.Button{
					Text: text,
					Type: schemes.ButtonType(btnType),
				})
			}
		}

		rows = append(rows, row)
	}

	return schemes.NewInlineKeyboardAttachmentRequest(schemes.Keyboard{
		Buttons: rows,
	}), nil
}

func setMessageAttachment(msg *maxbot.Message, attachment interface{}) error {
	val := reflect.ValueOf(msg).Elem().FieldByName("message")
	if !val.IsValid() {
		return fmt.Errorf("failed to access message body")
	}

	ptr := reflect.NewAt(val.Type(), unsafe.Pointer(val.UnsafeAddr())).Elem()
	body := ptr.Interface().(*schemes.NewMessageBody)
	body.Attachments = append(body.Attachments, attachment)
	return nil
}

func (c *Client) doRequest(method, endpoint string, body interface{}, out interface{}) error {
	var reqBody *bytes.Buffer
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(data)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, err := http.NewRequest(method, c.baseURL+endpoint, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	q := req.URL.Query()
	q.Set("access_token", c.accessToken)
	req.URL.RawQuery = q.Encode()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("API error [%d]: %s", resp.StatusCode, resp.Status)
	}

	if out != nil {
		if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

func splitName(fullName string) (string, string) {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return "", ""
	}

	parts := strings.Fields(fullName)
	if len(parts) == 1 {
		return parts[0], ""
	}

	return parts[0], strings.Join(parts[1:], " ")
}

func toString(v interface{}) string {
	if v == nil {
		return ""
	}
	return fmt.Sprint(v)
}

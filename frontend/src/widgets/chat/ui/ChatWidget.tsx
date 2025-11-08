import { useState } from 'react';
import { Card, Input, Button, Avatar, Typography, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import './ChatWidget.css';

const { Text } = Typography;

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

interface ChatWidgetProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
}

/**
 * Chat Widget for group sessions
 * Real-time messaging between participants
 */
export const ChatWidget = ({
  messages,
  currentUserId,
  onSendMessage,
}: ChatWidgetProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="chat-widget">
      <div className="chat-widget__messages">
        {messages.length === 0 ? (
          <Empty
            description="Пока нет сообщений"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          messages.map((message) => {
            const isOwn = message.userId === currentUserId;
            return (
              <div
                key={message.id}
                className={`chat-widget__message ${
                  isOwn ? 'chat-widget__message--own' : ''
                }`}
              >
                {!isOwn && (
                  <Avatar
                    size={32}
                    src={message.avatar}
                    icon={<UserOutlined />}
                    className="chat-widget__avatar"
                  />
                )}
                <div className="chat-widget__message-content">
                  {!isOwn && (
                    <Text
                      strong
                      className="chat-widget__message-author"
                    >
                      {message.userName}
                    </Text>
                  )}
                  <div
                    className={`chat-widget__message-bubble ${
                      isOwn ? 'chat-widget__message-bubble--own' : ''
                    }`}
                  >
                    <Text className="chat-widget__message-text">
                      {message.text}
                    </Text>
                  </div>
                  <Text
                    type="secondary"
                    className="chat-widget__message-time"
                  >
                    {formatTime(message.createdAt)}
                  </Text>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="chat-widget__input-area">
        <Input.TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Написать сообщение..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          className="chat-widget__input"
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="chat-widget__send-btn"
        >
          Отправить
        </Button>
      </div>
    </Card>
  );
};

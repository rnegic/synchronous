/**
 * ProfileBottomSheet
 * Bottom drawer with user profile actions
 */

import { memo } from 'react';
import { Drawer, Avatar, Typography, List } from 'antd';
import { HistoryOutlined, UserOutlined } from '@ant-design/icons';
import './ProfileBottomSheet.css';

const { Title, Text } = Typography;

interface ProfileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  avatarUrl?: string;
  onOpenHistory?: () => void;
}

export const ProfileBottomSheet = memo<ProfileBottomSheetProps>(({
  open,
  onClose,
  userName,
  avatarUrl,
  onOpenHistory,
}) => {
  const handleHistoryClick = () => {
    if (onOpenHistory) {
      onOpenHistory();
    }
    onClose();
  };

  const menuItems = [
    {
      key: 'history',
      title: 'История сессий',
      description: 'Все прошедшие сессии и отчеты',
      icon: <HistoryOutlined />,
      action: handleHistoryClick,
    },
  ];

  return (
    <Drawer
      placement="bottom"
      closable={false}
      height="auto"
      open={open}
      onClose={onClose}
      className="profile-sheet"
      styles={{
        body: { padding: '24px 16px 32px' },
      }}
    >
      <div className="profile-sheet__header">
        <Avatar
          size={72}
          src={avatarUrl}
          icon={!avatarUrl ? <UserOutlined /> : undefined}
        >
          {!avatarUrl ? userName.charAt(0).toUpperCase() : null}
        </Avatar>
        <Title level={4} className="profile-sheet__name">
          {userName}
        </Title>
        <Text type="secondary" className="profile-sheet__subtitle">
          Управляйте своим профилем и сессиями
        </Text>
      </div>

      <List
        itemLayout="horizontal"
        split={false}
        dataSource={menuItems}
        renderItem={(item) => (
          <List.Item
            className="profile-sheet__item"
            onClick={item.action}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                item.action();
              }
            }}
          >
            <div className="profile-sheet__item-icon">{item.icon}</div>
            <div className="profile-sheet__item-content">
              <div className="profile-sheet__item-title">{item.title}</div>
              <Text type="secondary" className="profile-sheet__item-description">
                {item.description}
              </Text>
            </div>
          </List.Item>
        )}
      />
    </Drawer>
  );
});

ProfileBottomSheet.displayName = 'ProfileBottomSheet';

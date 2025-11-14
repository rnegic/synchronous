import { useState, useCallback } from 'react';
import { Avatar, Typography, Button } from 'antd';
import { ArrowLeftOutlined, UserOutlined } from '@ant-design/icons';
import { ProfileBottomSheet } from './ProfileBottomSheet';
import './Header.css';

const { Text, Title } = Typography;

interface HeaderProps {
  variant?: 'home' | 'page';
  userName?: string;
  pageTitle?: string;
  onBack?: () => void;
  avatarUrl?: string;
  onSessionHistoryNavigate?: () => void;
}

export const Header = ({
  variant = 'home',
  userName = 'Пользователь',
  pageTitle,
  onBack,
  avatarUrl,
  onSessionHistoryNavigate,
}: HeaderProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleToggleSheet = useCallback(() => {
    setIsSheetOpen((prev) => !prev);
  }, []);

  const handleCloseSheet = useCallback(() => setIsSheetOpen(false), []);

  const handleHistoryClick = useCallback(() => {
    if (onSessionHistoryNavigate) {
      onSessionHistoryNavigate();
    }
    setIsSheetOpen(false);
  }, [onSessionHistoryNavigate]);

  return (
    <header className="header">
      {variant === 'home' ? (
        <>
          <div className="header__left">
            <Text type="secondary" className="header__greeting">
              Привет!
            </Text>
            <Title level={4} className="header__username">
              {userName}
            </Title>
          </div>
          <div
            className="header__right header__avatar-trigger"
            role="button"
            tabIndex={0}
            onClick={handleToggleSheet}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggleSheet();
              }
            }}
          >
            <Avatar size={44} src={avatarUrl} icon={<UserOutlined />} />
          </div>
        </>
      ) : (
        <>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="header__back"
          />
          <Title level={4} className="header__page-title">
            {pageTitle}
          </Title>
          <div
            className="header__right header__avatar-trigger"
            role="button"
            tabIndex={0}
            onClick={handleToggleSheet}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggleSheet();
              }
            }}
          >
            <Avatar size={36} src={avatarUrl} icon={<UserOutlined />} />
          </div>
        </>
      )}

      <ProfileBottomSheet
        open={isSheetOpen}
        onClose={handleCloseSheet}
        userName={userName}
        avatarUrl={avatarUrl}
        onOpenHistory={handleHistoryClick}
      />
    </header>
  );
};

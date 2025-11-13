import { Button, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import './InviteFriends.css';

interface InviteFriendsProps {
  sessionInviteCode?: string; // inviteLink code from backend (8 chars)
  onInvite?: (userIds: string[]) => void;
}

export const InviteFriends = ({ sessionInviteCode }: InviteFriendsProps) => {
  const botBaseUrl = import.meta.env.VITE_MAX_BOT_URL || `https://max.ru/${import.meta.env.VITE_MAX_BOT_USERNAME || 't71_hakaton_bot'}?startapp=`;
  const shareUrl = sessionInviteCode ? `${botBaseUrl}invite_${sessionInviteCode}` : botBaseUrl;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    message.success('Ссылка скопирована! Отправьте её друзьям');
  };
  
  return (
    <Button
      type="primary"
      icon={<UserAddOutlined />}
      onClick={handleCopyLink}
      className="invite-friends__trigger"
      size="large"
    >
      Пригласить друзей
    </Button>
  );
};

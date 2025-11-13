import { useEffect, useMemo, useState } from 'react';
import { Modal, List, Avatar, Button, message, Input, Empty } from 'antd';
import { UserAddOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons';
import { usersApi } from '@/shared/api';
import type { Contact } from '@/shared/api';
import { useMaxWebApp } from '@/shared/hooks/useMaxWebApp';
import './InviteFriends.css';

interface InviteFriendsProps {
  sessionInviteCode?: string; // inviteLink code from backend (8 chars)
  onInvite?: (userIds: string[]) => void;
}

export const InviteFriends = ({ sessionInviteCode, onInvite }: InviteFriendsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const { isMaxEnvironment } = useMaxWebApp();
  
  const botBaseUrl = import.meta.env.VITE_MAX_BOT_URL || `https://max.ru/${import.meta.env.VITE_MAX_BOT_USERNAME || 't71_hakaton_bot'}?startapp=`;
  const shareUrl = sessionInviteCode ? `${botBaseUrl}invite_${sessionInviteCode}` : botBaseUrl;
  
  // Load contacts when modal opens
  useEffect(() => {
    if (!isModalOpen) return;
    let isMounted = true;
    setLoading(true);
    usersApi.getContacts()
      .then((res) => {
        if (isMounted) setContacts(res.contacts || []);
      })
      .catch(() => {
        if (isMounted) setContacts([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [isModalOpen]);
  
  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(q));
  }, [contacts, searchQuery]);
  
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSearchQuery('');
    setSelectedUsers(new Set());
  };
  
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };
  
  const handleSendInvites = () => {
    if (selectedUsers.size === 0) {
      message.warning('Выберите хотя бы одного друга');
      return;
    }
    const ids = Array.from(selectedUsers);
    if (onInvite) onInvite(ids);

    if (isMaxEnvironment && window.WebApp) {
      // We can't DM contacts from frontend; open bot with payload for user to share further
      window.WebApp.openMaxLink(shareUrl);
      message.success('Открываю бота для отправки приглашения');
    } else {
      navigator.clipboard.writeText(shareUrl);
      message.success('Ссылка скопирована в буфер обмена');
    }
    
    handleCloseModal();
  };
  
  return (
    <>
      <Button
        type="primary"
        icon={<UserAddOutlined />}
        onClick={handleOpenModal}
        className="invite-friends__trigger"
        size="large"
      >
        Пригласить друзей
      </Button>
      
      <Modal
        title="Пригласить друзей в сессию"
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={[
          <Button key="cancel" onClick={handleCloseModal}>
            Отмена
          </Button>,
          <Button
            key="send"
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendInvites}
            disabled={selectedUsers.size === 0}
          >
            Отправить ({selectedUsers.size})
          </Button>,
        ]}
        width={500}
        className="invite-friends__modal"
      >
        <div className="invite-friends__content">
          <Input
            placeholder="Поиск контактов..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="large"
            className="invite-friends__search"
          />
          
          {loading ? null : filteredContacts.length === 0 ? (
            <Empty description="Контакты не найдены" />
          ) : (
            <List
              className="invite-friends__list"
              dataSource={filteredContacts}
              renderItem={(user) => {
                const isSelected = selectedUsers.has(user.id);
                return (
                  <List.Item
                    className={`invite-friends__list-item ${isSelected ? 'invite-friends__list-item--selected' : ''}`}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={user.avatarUrl || undefined}
                          size="large"
                          style={{
                            backgroundColor: user.avatarUrl ? undefined : 'var(--color-lavender)',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {!user.avatarUrl && user.name.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <span className="invite-friends__user-name">
                          {user.name}
                        </span>
                      }
                      description={isSelected && (
                        <span className="invite-friends__selected-label">
                          ✓ Выбрано
                        </span>
                      )}
                    />
                  </List.Item>
                );
              }}
            />
          )}
          
          <div className="invite-friends__info">
            <span>💬 Ссылка-приглашение откроется в Max или скопируется</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

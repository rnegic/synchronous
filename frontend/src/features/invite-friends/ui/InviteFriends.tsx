import { useState } from 'react';
import { Modal, List, Avatar, Button, message, Input } from 'antd';
import { UserAddOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons';
import { mockUsers } from '@/shared/lib/mockData';
import type { User } from '@/shared/types';
import './InviteFriends.css';

interface InviteFriendsProps {
  sessionId?: string; // Optional for now, will be used for API integration
  onInvite?: (users: User[]) => void;
}

export const InviteFriends = ({ onInvite }: InviteFriendsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Filter contacts based on search query
  const filteredContacts = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
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
    
    const invitedUsers = mockUsers.filter(user => selectedUsers.has(user.id));
    
    // Simulate sending invite link via Max messenger
    message.success(`Приглашения отправлены ${selectedUsers.size} ${selectedUsers.size === 1 ? 'другу' : 'друзьям'}`);
    
    if (onInvite) {
      onInvite(invitedUsers);
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
          
          <List
            className="invite-friends__list"
            dataSource={filteredContacts}
            locale={{ emptyText: 'Контакты не найдены' }}
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
                        src={user.avatar}
                        size="large"
                        style={{
                          backgroundColor: user.avatar ? undefined : 'var(--color-lavender)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {!user.avatar && user.name.charAt(0).toUpperCase()}
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
          
          <div className="invite-friends__info">
            <span>💬 Ссылка-приглашение будет отправлена через Max</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

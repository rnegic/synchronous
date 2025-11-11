/**
 * Onboarding Page
 * Welcome screen with Max Messenger authentication
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Typography, message } from 'antd';
import { 
  CheckCircleOutlined, 
  RocketOutlined, 
  TeamOutlined,
  TrophyOutlined 
} from '@ant-design/icons';
import { useAuth } from '@/app/store';
import styles from './Onboarding.module.css';

const { Title, Paragraph } = Typography;

/**
 * Feature card for onboarding
 */
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, title, description }) => (
  <Card className={styles.featureCard}>
    <div className={styles.featureIcon}>{icon}</div>
    <Title level={4}>{title}</Title>
    <Paragraph>{description}</Paragraph>
  </Card>
);

export function OnboardingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login, error } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle Max Messenger authentication
   * In production, this will integrate with Max SDK
   */
  const handleMaxAuth = async () => {
    setIsAuthenticating(true);
    
    try {
      // TODO: Replace with actual Max Messenger SDK integration
      // For now, we'll use mock data for development
      const mockMaxToken = 'dev_max_token_' + Date.now();
      const deviceId = navigator.userAgent; // Use user agent as device ID for now

      await login(mockMaxToken, deviceId);
      
      message.success('Вход выполнен успешно!');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(error || 'Ошибка входа. Попробуйте снова.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <RocketOutlined className={styles.mainIcon} />
          <Title level={1} className={styles.title}>
            Focus Sync
          </Title>
          <Paragraph className={styles.subtitle}>
            Планируй задачи. Фокусируйся на работе. Достигай целей вместе с друзьями.
          </Paragraph>
        </div>

        {/* Features */}
        <div className={styles.features}>
          <Feature
            icon={<CheckCircleOutlined />}
            title="Планируй"
            description="Создавай список задач и организуй свой рабочий процесс эффективно"
          />
          <Feature
            icon={<TeamOutlined />}
            title="Фокусируйся"
            description="Используй технику Pomodoro для максимальной концентрации"
          />
          <Feature
            icon={<TrophyOutlined />}
            title="Достигай"
            description="Соревнуйся с друзьями и отслеживай свой прогресс"
          />
        </div>

        {/* Auth Button */}
        <div className={styles.authSection}>
          <Button
            type="primary"
            size="large"
            onClick={handleMaxAuth}
            loading={isAuthenticating || isLoading}
            className={styles.authButton}
            icon={<RocketOutlined />}
          >
            {isAuthenticating ? 'Вход...' : 'Войти через Max'}
          </Button>
          <Paragraph type="secondary" className={styles.authHint}>
            Используйте аккаунт Max Messenger для входа
          </Paragraph>
        </div>
      </div>
    </div>
  );
}
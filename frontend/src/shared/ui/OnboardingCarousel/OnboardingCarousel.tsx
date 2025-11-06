import { useRef, useEffect } from 'react';
import { OnboardingCard } from '../OnboardingCard';
import type { OnboardingStep } from '@/shared/types';
import './OnboardingCarousel.css';

interface OnboardingCarouselProps {
  steps: OnboardingStep[];
}

/**
 * Onboarding carousel component
 * Auto-scrolls through onboarding steps with smooth scroll behavior
 */
export const OnboardingCarousel = ({ steps }: OnboardingCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const autoScroll = () => {
      const maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScroll) {
        carousel.scrollLeft = 0;
      } else {
        carousel.scrollLeft += carousel.offsetWidth * 0.82;
      }
    };

    const interval = setInterval(autoScroll, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="onboarding-carousel" ref={carouselRef}>
      {steps.map((step) => (
        <div key={step.id} className="onboarding-carousel__item">
          <OnboardingCard step={step} />
        </div>
      ))}
    </div>
  );
};

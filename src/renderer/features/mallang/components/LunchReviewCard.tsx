import { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { TodayWinner } from '../../../shared/api/visit-records-api';

interface Props {
  winner: TodayWinner;
  onSubmit: (data: {
    rating: number;
    note: string;
    wantsAgain: boolean | null;
  }) => void;
  onDismiss: () => void;
  isSubmitting: boolean;
}

export function LunchReviewCard({
  winner,
  onSubmit,
  onDismiss,
  isSubmitting,
}: Props) {
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [wantsAgain, setWantsAgain] = useState<boolean | null>(null);

  const canSubmit = rating > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ rating, note, wantsAgain });
  };

  return (
    <AnimatePresence>
      <Backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Card
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <Header>
            <Title>오늘 점심 어땠어? 🍽️</Title>
            <RestaurantName>{winner.restaurantName}</RestaurantName>
          </Header>

          <Section>
            <Label>별점</Label>
            <Stars>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarButton
                  key={star}
                  onClick={() => setRating(star)}
                  $active={star <= rating}
                  type="button"
                >
                  ★
                </StarButton>
              ))}
            </Stars>
          </Section>

          <Section>
            <Label>한 줄 메모 (선택)</Label>
            <NoteInput
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="맛이 어땠는지 짧게 남겨줘!"
              maxLength={200}
            />
          </Section>

          <Section>
            <Label>또 가고 싶어?</Label>
            <ToggleRow>
              <ToggleButton
                $active={wantsAgain === true}
                onClick={() => setWantsAgain(wantsAgain === true ? null : true)}
                type="button"
              >
                👍 응!
              </ToggleButton>
              <ToggleButton
                $active={wantsAgain === false}
                onClick={() =>
                  setWantsAgain(wantsAgain === false ? null : false)
                }
                type="button"
              >
                👎 글쎄…
              </ToggleButton>
            </ToggleRow>
          </Section>

          <Footer>
            <DismissButton onClick={onDismiss} type="button">
              나중에
            </DismissButton>
            <SubmitButton
              onClick={handleSubmit}
              disabled={!canSubmit}
              type="button"
            >
              {isSubmitting ? '보내는 중…' : '보내기'}
            </SubmitButton>
          </Footer>
        </Card>
      </Backdrop>
    </AnimatePresence>
  );
}

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 100;
`;

const Card = styled(motion.div)`
  width: 280px;
  background: #fff;
  border-radius: 20px;
  padding: 24px 20px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Header = styled.div`
  text-align: center;
`;

const Title = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: #333;
`;

const RestaurantName = styled.div`
  margin-top: 4px;
  font-size: 17px;
  font-weight: 800;
  color: #ff6b35;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #666;
`;

const Stars = styled.div`
  display: flex;
  gap: 4px;
  justify-content: center;
`;

const StarButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: ${(p) => (p.$active ? '#ffc107' : '#ddd')};
  transition:
    color 0.15s,
    transform 0.1s;
  padding: 0;
  line-height: 1;

  &:hover {
    transform: scale(1.15);
  }
`;

const NoteInput = styled.input`
  border: 1.5px solid #e8e8e8;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #ff6b35;
  }

  &::placeholder {
    color: #bbb;
  }
`;

const ToggleRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 0;
  border-radius: 10px;
  border: 1.5px solid ${(p) => (p.$active ? '#ff6b35' : '#e8e8e8')};
  background: ${(p) => (p.$active ? '#fff3ee' : '#fff')};
  color: ${(p) => (p.$active ? '#ff6b35' : '#888')};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
`;

const Footer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;
`;

const DismissButton = styled.button`
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  border: 1.5px solid #e8e8e8;
  background: #fff;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 10px 0;
  border-radius: 12px;
  border: none;
  background: #ff6b35;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

import type { KeyboardEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import styled from 'styled-components';

/* ===== 공통 스타일 ===== */

const Row = styled.form`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
`;

const PillInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 52px;
  padding: 0 22px;
  border: none;
  outline: none;
  background: ${({ theme }) => theme.brand.promptBg};
  color: ${({ theme }) => theme.brand.promptText};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 14px;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.brand.promptPlaceholder};
  }
`;

const SendButton = styled.button`
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  background: ${({ theme }) => theme.brand.promptBg};
  color: ${({ theme }) => theme.brand.promptText};
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 700;
  transition:
    background-color 160ms ease,
    transform 120ms ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.brand.primaryHover};
  }
  &:active:not(:disabled) {
    transform: scale(0.96);
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

/* ===== TextInput ===== */

interface TextInputProps {
  placeholder: string;
  maxLength: number;
  allowEmpty?: boolean;
  onSubmit: (value: string) => void;
}

export function TextInput({
  placeholder,
  maxLength,
  allowEmpty,
  onSubmit,
}: TextInputProps) {
  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const disabled = !allowEmpty && value.trim().length === 0;

  const submit = () => {
    if (disabled) return;
    onSubmit(value.trim());
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <Row
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <PillInput
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setValue(event.target.value.slice(0, maxLength))
        }
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      <SendButton type="submit" disabled={disabled} aria-label="보내기">
        ↑
      </SendButton>
    </Row>
  );
}

/* ===== TimeTripleInput ===== */

const TimeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
`;

const TimeLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.brand.subtitle};
  text-align: center;
`;

const TimeInput = styled.input`
  height: 44px;
  border: 1.5px solid transparent;
  border-radius: 14px;
  background: ${({ theme }) => theme.brand.inputBg};
  color: ${({ theme }) => theme.brand.inputText};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  text-align: center;
  outline: none;
  padding: 0 8px;
  transition: border-color 160ms ease;

  &:focus {
    border-color: ${({ theme }) => theme.brand.primary};
  }

  &::-webkit-calendar-picker-indicator {
    opacity: 0.4;
  }
`;

const TimeSubmitRow = styled.div`
  display: flex;
  justify-content: flex-end;
  width: 100%;
  margin-top: 8px;
`;

interface TimeTripleProps {
  onSubmit: (values: {
    workStart: string;
    lunch: string;
    workEnd: string;
  }) => void;
}

export function TimeTripleInput({ onSubmit }: TimeTripleProps) {
  const [workStart, setWorkStart] = useState('09:00');
  const [lunch, setLunch] = useState('12:30');
  const [workEnd, setWorkEnd] = useState('18:00');

  const disabled = !workStart || !lunch || !workEnd;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <TimeGrid>
        <TimeLabel>
          출근
          <TimeInput
            type="time"
            value={workStart}
            onChange={(e) => setWorkStart(e.target.value)}
          />
        </TimeLabel>
        <TimeLabel>
          점심
          <TimeInput
            type="time"
            value={lunch}
            onChange={(e) => setLunch(e.target.value)}
          />
        </TimeLabel>
        <TimeLabel>
          퇴근
          <TimeInput
            type="time"
            value={workEnd}
            onChange={(e) => setWorkEnd(e.target.value)}
          />
        </TimeLabel>
      </TimeGrid>
      <TimeSubmitRow>
        <SendButton
          type="button"
          disabled={disabled}
          onClick={() => onSubmit({ workStart, lunch, workEnd })}
          aria-label="시간 보내기"
        >
          ↑
        </SendButton>
      </TimeSubmitRow>
    </div>
  );
}

/* ===== ChoiceInput ===== */

const ChoiceGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
`;

const Chip = styled.button`
  flex: 1 1 auto;
  min-height: 48px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.brand.inputBg};
  color: ${({ theme }) => theme.brand.primary};
  border: 1.5px solid transparent;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    border-color 160ms ease,
    transform 120ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.brand.primary};
  }
  &:active {
    transform: scale(0.97);
  }
`;

interface ChoiceProps<T extends string> {
  options: { value: T; label: string }[];
  onSubmit: (value: T) => void;
}

export function ChoiceInput<T extends string>({
  options,
  onSubmit,
}: ChoiceProps<T>) {
  return (
    <ChoiceGrid>
      {options.map((option) => (
        <Chip
          key={option.value}
          type="button"
          onClick={() => onSubmit(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </ChoiceGrid>
  );
}

/* ===== ConfirmInput (yes/no) ===== */

const ConfirmRow = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
`;

const ConfirmYes = styled(Chip)`
  background: ${({ theme }) => theme.brand.primary};
  color: ${({ theme }) => theme.brand.promptText};

  &:hover {
    background: ${({ theme }) => theme.brand.primaryHover};
    border-color: transparent;
  }
`;

interface ConfirmProps {
  onYes: () => void;
  onNo: () => void;
}

export function ConfirmInput({ onYes, onNo }: ConfirmProps) {
  return (
    <ConfirmRow>
      <Chip type="button" onClick={onNo}>
        다시 알려줄게
      </Chip>
      <ConfirmYes type="button" onClick={onYes}>
        맞아!
      </ConfirmYes>
    </ConfirmRow>
  );
}

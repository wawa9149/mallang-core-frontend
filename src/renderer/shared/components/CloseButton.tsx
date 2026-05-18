import styled from 'styled-components';

const Button = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.brand.subtitle};
  cursor: pointer;
  -webkit-app-region: no-drag;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.brand.inputBg};
    color: ${({ theme }) => theme.brand.title};
  }

  &:active {
    transform: scale(0.96);
  }
`;

interface CloseButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

/**
 * 마이페이지/그룹 등 보조 창의 우상단에 띄우는 닫기 버튼.
 * 부모 컨테이너는 position: relative여야 한다.
 */
export function CloseButton({ onClick, ariaLabel = '닫기' }: CloseButtonProps) {
  return (
    <Button type="button" onClick={onClick} aria-label={ariaLabel}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.5 1.5L12.5 12.5M12.5 1.5L1.5 12.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </Button>
  );
}

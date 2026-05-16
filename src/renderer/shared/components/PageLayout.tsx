import type { PropsWithChildren, ReactNode } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;

const Body = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 32px;
  box-shadow: ${({ theme }) => theme.shadows.card};
  flex: 1;
`;

interface Props {
  title: string;
  subtitle?: ReactNode;
}

export function PageLayout({
  title,
  subtitle,
  children,
}: PropsWithChildren<Props>) {
  return (
    <Wrap>
      <Header>
        <Title>{title}</Title>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Header>
      <Body>{children}</Body>
    </Wrap>
  );
}

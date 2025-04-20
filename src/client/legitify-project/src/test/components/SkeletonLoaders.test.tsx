import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  CardSkeleton,
  WelcomeCardSkeleton,
  QuickActionsSkeleton,
  StatsGridSkeleton,
  ActivityListSkeleton,
  ProgressBarsSkeleton,
  DualColumnSkeleton,
  UniversityDashboardSkeleton,
  IndividualDashboardSkeleton,
  EmployerDashboardSkeleton,
  DashboardSkeleton
} from '../../components/SkeletonLoaders'; // Adjust the import path as needed

// Mock Mantine components to simplify testing
vi.mock('@mantine/core', () => ({
  Box: ({ children, mb }: { children: React.ReactNode; mb?: string | number }) => 
    <div data-testid="box" data-mb={mb}>{children}</div>,
  Card: ({ 
    children, 
    withBorder, 
    p, 
    radius, 
    style 
  }: { 
    children: React.ReactNode; 
    withBorder?: boolean; 
    p?: string; 
    radius?: string; 
    style?: React.CSSProperties 
  }) => 
    <div data-testid="card" data-withborder={withBorder} data-p={p} data-radius={radius} style={style}>{children}</div>,
  Container: ({ 
    children, 
    size, 
    py 
  }: { 
    children: React.ReactNode; 
    size?: string; 
    py?: string 
  }) => 
    <div data-testid="container" data-size={size} data-py={py}>{children}</div>,
  Grid: ({ children, mb }: { children: React.ReactNode; mb?: string }) => 
    <div data-testid="grid" data-mb={mb}>{children}</div>,
  'Grid.Col': ({ 
    children, 
    span, 
    key 
  }: { 
    children: React.ReactNode; 
    span?: any; 
    key?: string | number 
  }) => 
    <div data-testid="grid-col" data-span={JSON.stringify(span)} data-key={key}>{children}</div>,
  Group: ({ 
    children, 
    justify, 
    mb, 
    wrap 
  }: { 
    children: React.ReactNode; 
    justify?: string; 
    mb?: string | number; 
    wrap?: string 
  }) => 
    <div data-testid="group" data-justify={justify} data-mb={mb} data-wrap={wrap}>{children}</div>,
  Paper: ({ 
    children, 
    withBorder, 
    radius, 
    p, 
    mb 
  }: { 
    children: React.ReactNode; 
    withBorder?: boolean; 
    radius?: string; 
    p?: string; 
    mb?: string 
  }) => 
    <div data-testid="paper" data-withborder={withBorder} data-radius={radius} data-p={p} data-mb={mb}>{children}</div>,
  SimpleGrid: ({ 
    children, 
    cols, 
    spacing, 
    mb 
  }: { 
    children: React.ReactNode; 
    cols?: any; 
    spacing?: string; 
    mb?: string 
  }) => 
    <div data-testid="simple-grid" data-cols={JSON.stringify(cols)} data-spacing={spacing} data-mb={mb}>{children}</div>,
  Skeleton: ({ 
    height, 
    width, 
    mb, 
    mt, 
    circle, 
    radius 
  }: { 
    height?: number | string; 
    width?: number | string; 
    mb?: string; 
    mt?: string; 
    circle?: boolean; 
    radius?: string 
  }) => 
    <div 
      data-testid="skeleton" 
      data-height={height} 
      data-width={width} 
      data-mb={mb} 
      data-mt={mt} 
      data-circle={circle ? 'true' : undefined}
      data-radius={radius}
    ></div>,
  Stack: ({ children, gap }: { children: React.ReactNode; gap?: string }) => 
    <div data-testid="stack" data-gap={gap}>{children}</div>
}));

describe('Dashboard Skeleton Components', () => {
  describe('CardSkeleton', () => {
    it('should render with default props', () => {
      render(<CardSkeleton />);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card.getAttribute('data-withborder')).toBe('true');
      expect(card.getAttribute('data-p')).toBe('md');
      expect(card.getAttribute('data-radius')).toBe('md');
      expect(card.style.height).toBe('200px');
      
      // Verify skeleton elements are rendered
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBe(4);
    });
    
    it('should render with custom height', () => {
      render(<CardSkeleton height={300} />);
      
      const card = screen.getByTestId('card');
      expect(card.style.height).toBe('300px');
    });
    
    it('should render with children instead of default skeleton', () => {
      render(<CardSkeleton>
        <div data-testid="custom-content">Custom Content</div>
      </CardSkeleton>);
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
      expect(screen.queryAllByTestId('skeleton').length).toBe(0);
    });
  });
  
  describe('WelcomeCardSkeleton', () => {
    it('should render correctly', () => {
      render(<WelcomeCardSkeleton />);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card.getAttribute('data-withborder')).toBe('true');
      
      const group = screen.getByTestId('group');
      expect(group.getAttribute('data-justify')).toBe('space-between');
      
      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBe(3);
      // Check for circle skeleton
      expect(skeletons.some(s => s.getAttribute('data-circle') === 'true')).toBe(true);
    });
  });
  
  describe('QuickActionsSkeleton', () => {
    it('should render with default props', () => {
      render(<QuickActionsSkeleton />);
      
      const simpleGrid = screen.getByTestId('simple-grid');
      const cards = screen.getAllByTestId('card');
      
      // Default should have 2 columns
      expect(JSON.parse(simpleGrid.getAttribute('data-cols') || '{}')).toHaveProperty('sm', 2);
      expect(cards.length).toBe(2);
    });
    
    it('should render with custom columns', () => {
      render(<QuickActionsSkeleton columns={4} />);
      
      const simpleGrid = screen.getByTestId('simple-grid');
      const cards = screen.getAllByTestId('card');
      
      expect(JSON.parse(simpleGrid.getAttribute('data-cols') || '{}')).toHaveProperty('sm', 4);
      expect(cards.length).toBe(4);
    });
  });
  
  describe('StatsGridSkeleton', () => {
    it('should render with default props', () => {
      render(<StatsGridSkeleton />);
      
      const gridCols = screen.getAllByTestId('grid-col');
      expect(gridCols.length).toBe(4); // Default is 4 columns
    });
    
    it('should render with custom columns', () => {
      render(<StatsGridSkeleton columns={2} />);
      
      const gridCols = screen.getAllByTestId('grid-col');
      expect(gridCols.length).toBe(2);
    });
  });
  
  describe('ActivityListSkeleton', () => {
    it('should render with default props', () => {
      render(<ActivityListSkeleton />);
      
      const paper = screen.getByTestId('paper');
      const cards = screen.getAllByTestId('card');
      
      expect(paper).toBeInTheDocument();
      expect(cards.length).toBe(3); // Default is 3 items
    });
    
    it('should render with custom items count', () => {
      render(<ActivityListSkeleton items={5} />);
      
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(5);
    });
  });
  
  describe('ProgressBarsSkeleton', () => {
    it('should render with default props', () => {
      render(<ProgressBarsSkeleton />);
      
      const boxes = screen.getAllByTestId('box');
      expect(boxes.length).toBe(3); // Default is 3 bars
    });
    
    it('should render with custom bars count', () => {
      render(<ProgressBarsSkeleton bars={5} />);
      
      const boxes = screen.getAllByTestId('box');
      expect(boxes.length).toBe(5);
    });
  });
  
  describe('DualColumnSkeleton', () => {
    it('should render correctly', () => {
      render(<DualColumnSkeleton />);
      
      const simpleGrid = screen.getByTestId('simple-grid');
      const papers = screen.getAllByTestId('paper');
      
      expect(simpleGrid).toBeInTheDocument();
      expect(papers.length).toBe(2);
      
      // Each column should have 3 cards
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBe(6);
    });
  });
  
  describe('Role-specific Dashboard Skeletons', () => {
    it('should render UniversityDashboardSkeleton correctly', () => {
      render(<UniversityDashboardSkeleton />);
      
      // Should include StatsGridSkeleton and ActivityListSkeleton
      const grid = screen.getByTestId('grid');
      const paper = screen.getByTestId('paper');
      
      expect(grid).toBeInTheDocument();
      expect(paper).toBeInTheDocument();
    });
    
    it('should render IndividualDashboardSkeleton correctly', () => {
      render(<IndividualDashboardSkeleton />);
      
      // Should include ProgressBarsSkeleton and DualColumnSkeleton
      const papers = screen.getAllByTestId('paper');
      const simpleGrid = screen.getByTestId('simple-grid');
      
      expect(papers.length).toBeGreaterThan(0);
      expect(simpleGrid).toBeInTheDocument();
    });
    
    it('should render EmployerDashboardSkeleton correctly', () => {
      render(<EmployerDashboardSkeleton />);
      
      const simpleGrid = screen.getByTestId('simple-grid');
      const papers = screen.getAllByTestId('paper');
      
      expect(simpleGrid).toBeInTheDocument();
      expect(papers.length).toBe(3); // Two in the grid and one below
    });
  });
  
  describe('DashboardSkeleton', () => {
    it('should return null when no userRole is provided', () => {
      const { container } = render(<DashboardSkeleton />);
      expect(container.innerHTML).toBe('');
    });
    
    it('should render for university role', () => {
      render(<DashboardSkeleton userRole="university" />);
      
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      
      // Should include common components and university specific components
      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
    });
    
    it('should render for individual role', () => {
      render(<DashboardSkeleton userRole="individual" />);
      
      // Should include common components and individual specific components
      const boxes = screen.getAllByTestId('box');
      // Use getAllByTestId instead of getByTestId since there are multiple SimpleGrids
      const simpleGrids = screen.getAllByTestId('simple-grid');
      
      expect(boxes.length).toBeGreaterThan(0);
      expect(simpleGrids.length).toBeGreaterThan(0);
      
      // Check for ProgressBarsSkeleton which is specific to individual users
      const progressBarsContainer = screen.getByTestId('paper');
      const progressBars = within(progressBarsContainer).getAllByTestId('box');
      expect(progressBars.length).toBe(3); // Default is 3 bars
    });
    
    it('should render for employer role', () => {
      render(<DashboardSkeleton userRole="employer" />);
      
      // Should include quick actions with 3 columns for employer
      const simpleGrids = screen.getAllByTestId('simple-grid');
      
      // The first SimpleGrid should be the QuickActionsSkeleton with 3 columns for employer
      const quickActionsGrid = simpleGrids[0];
      const colsData = JSON.parse(quickActionsGrid.getAttribute('data-cols') || '{}');
      
      // Verify it has sm: 3 for employer (instead of the default 2)
      expect(colsData).toHaveProperty('sm', 3);
    });
  });
});
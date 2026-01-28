import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityListSkeleton,
  CardSkeleton,
  DashboardSkeleton,
  DualColumnSkeleton,
  HolderDashboardSkeleton,
  IssuerDashboardSkeleton,
  ProgressBarsSkeleton,
  QuickActionsSkeleton,
  StatsGridSkeleton,
  VerifierDashboardSkeleton,
  WelcomeCardSkeleton,
} from '../../components/SkeletonLoaders';

// Mock only the Mantine components, not our own components
vi.mock('@mantine/core', () => {
  // Helper to create a mock component that handles all props
  const createMockComponent = (name: string, dataTestId: string) => {
    return function MockComponent(props: Record<string, any>) {
      const { children, ...rest } = props;
      // Convert all props to data-* attributes for testing
      const dataProps = Object.entries(rest).reduce<Record<string, any>>((acc, [key, value]) => {
        // Handle special cases for style, objects and arrays
        if (key === 'style') {
          return { ...acc, style: value };
        } else if (value === undefined || value === null) {
          return acc;
        } else if (typeof value === 'object') {
          return { ...acc, [`data-${key.toLowerCase()}`]: JSON.stringify(value) };
        } else {
          return { ...acc, [`data-${key.toLowerCase()}`]: value };
        }
      }, {});

      // Render the component with all props converted to data attributes
      return (
        <div data-testid={dataTestId} {...dataProps}>
          {children}
        </div>
      );
    };
  };

  // Create mocks for all Mantine components used in the tests
  const components = {
    Box: createMockComponent('Box', 'box'),
    Card: createMockComponent('Card', 'card'),
    Container: createMockComponent('Container', 'container'),
    Grid: createMockComponent('Grid', 'grid'),
    Group: createMockComponent('Group', 'group'),
    Paper: createMockComponent('Paper', 'paper'),
    SimpleGrid: createMockComponent('SimpleGrid', 'simple-grid'),
    Skeleton: createMockComponent('Skeleton', 'skeleton'),
    Stack: createMockComponent('Stack', 'stack'),
  };

  // Add Grid.Col component as a property of Grid
  Object.assign(components.Grid, { Col: createMockComponent('Grid.Col', 'grid-col') });

  return components;
});

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

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
      render(
        <CardSkeleton>
          <div data-testid="custom-content">Custom Content</div>
        </CardSkeleton>,
      );

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
      expect(card.getAttribute('data-shadow')).toBe('sm');
      expect(card.getAttribute('data-p')).toBe('lg');
      expect(card.getAttribute('data-radius')).toBe('md');

      const group = screen.getByTestId('group');
      expect(group.getAttribute('data-justify')).toBe('space-between');
      expect(group.getAttribute('data-mb')).toBe('md');

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBe(3);
      // Check for circle skeleton
      expect(skeletons.some(s => s.getAttribute('data-circle') === 'true')).toBe(true);
    });
  });

  describe('QuickActionsSkeleton', () => {
    it('should render with default props', () => {
      render(<QuickActionsSkeleton />);

      const paper = screen.getByTestId('paper');
      expect(paper).toBeInTheDocument();
      expect(paper.getAttribute('data-withborder')).toBe('true');
      expect(paper.getAttribute('data-radius')).toBe('md');
      expect(paper.getAttribute('data-p')).toBe('md');
      expect(paper.getAttribute('data-mb')).toBe('xl');

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

      const statsGrid = screen.getByTestId('stats-grid-skeleton');
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid.getAttribute('data-columns')).toBe('4');

      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
      expect(grid.getAttribute('data-mb')).toBe('xl');

      const gridCols = screen.getAllByTestId('grid-col');
      expect(gridCols.length).toBe(4); // Default is 4 columns
    });

    it('should render with custom columns', () => {
      render(<StatsGridSkeleton columns={2} />);

      const statsGrid = screen.getByTestId('stats-grid-skeleton');
      expect(statsGrid).toBeInTheDocument();
      expect(statsGrid.getAttribute('data-columns')).toBe('2');

      const gridCols = screen.getAllByTestId('grid-col');
      expect(gridCols.length).toBe(2);
    });
  });

  describe('ActivityListSkeleton', () => {
    it('should render with default props', () => {
      render(<ActivityListSkeleton />);

      const paper = screen.getByTestId('paper');
      expect(paper).toBeInTheDocument();
      expect(paper.getAttribute('data-withborder')).toBe('true');
      expect(paper.getAttribute('data-radius')).toBe('md');
      expect(paper.getAttribute('data-p')).toBe('md');
      expect(paper.getAttribute('data-mb')).toBe('xl');

      const groups = screen.getAllByTestId('group');
      const headerGroup = groups[0]; // First group is the header
      expect(headerGroup.getAttribute('data-justify')).toBe('space-between');
      expect(headerGroup.getAttribute('data-mb')).toBe('md');

      const stack = screen.getByTestId('stack');
      expect(stack).toBeInTheDocument();

      const cards = within(stack).getAllByTestId('card');
      expect(cards.length).toBe(3); // Default is 3 items
    });

    it('should render with custom items count', () => {
      render(<ActivityListSkeleton items={5} />);

      const stack = screen.getByTestId('stack');
      const cards = within(stack).getAllByTestId('card');
      expect(cards.length).toBe(5);
    });
  });

  describe('ProgressBarsSkeleton', () => {
    it('should render with default props', () => {
      render(<ProgressBarsSkeleton />);

      const paper = screen.getByTestId('paper');
      expect(paper).toBeInTheDocument();
      expect(paper.getAttribute('data-withborder')).toBe('true');
      expect(paper.getAttribute('data-radius')).toBe('md');
      expect(paper.getAttribute('data-p')).toBe('md');
      expect(paper.getAttribute('data-mb')).toBe('xl');

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
      expect(simpleGrid).toBeInTheDocument();
      expect(simpleGrid.getAttribute('data-mb')).toBe('xl');
      expect(JSON.parse(simpleGrid.getAttribute('data-cols') || '{}')).toHaveProperty('md', 2);
      expect(simpleGrid.getAttribute('data-spacing')).toBe('md');

      const papers = screen.getAllByTestId('paper');
      expect(papers.length).toBe(2);

      papers.forEach(paper => {
        expect(paper.getAttribute('data-withborder')).toBe('true');
        expect(paper.getAttribute('data-radius')).toBe('md');
        expect(paper.getAttribute('data-p')).toBe('md');

        const groups = within(paper).getAllByTestId('group');
        expect(groups[0].getAttribute('data-justify')).toBe('space-between');
        expect(groups[0].getAttribute('data-mb')).toBe('md');

        const stack = within(paper).getByTestId('stack');
        const cards = within(stack).getAllByTestId('card');
        expect(cards.length).toBe(3);
      });
    });
  });

  describe('Role-specific Dashboard Skeletons', () => {
    it('should render IssuerDashboardSkeleton correctly', () => {
      render(<IssuerDashboardSkeleton />);

      // Check for the issuer-dashboard-skeleton container
      const issuerDashboard = screen.getByTestId('issuer-dashboard-skeleton');
      expect(issuerDashboard).toBeInTheDocument();

      // Should include StatsGridSkeleton
      const statsGrid = screen.getByTestId('stats-grid-skeleton');
      expect(statsGrid).toBeInTheDocument();

      // Should include Grid
      const grid = screen.getByTestId('grid');
      expect(grid).toBeInTheDocument();
      expect(grid.getAttribute('data-mb')).toBe('xl');

      // Should include paper elements for ActivityListSkeleton
      // Use getAllByTestId and find the paper that has both withborder=true and mb=xl
      const papers = screen.getAllByTestId('paper');
      const activityListPaper = papers.find(
        paper =>
          paper.getAttribute('data-withborder') === 'true' &&
          paper.getAttribute('data-mb') === 'xl',
      );
      expect(activityListPaper).toBeInTheDocument();
    });

    it('should render HolderDashboardSkeleton correctly', () => {
      render(<HolderDashboardSkeleton />);

      // Check for the holder-dashboard-skeleton container
      const holderDashboard = screen.getByTestId('holder-dashboard-skeleton');
      expect(holderDashboard).toBeInTheDocument();

      // Should include paper elements
      const papers = screen.getAllByTestId('paper');
      // This test may need adjustment based on actual implementation
      expect(papers.length).toBeGreaterThan(0);
      expect(papers[0].getAttribute('data-mb')).toBe('xl');

      // Should include box elements for ProgressBarsSkeleton
      const boxes = screen.getAllByTestId('box');
      expect(boxes.length).toBe(3);

      // Should include SimpleGrid for DualColumnSkeleton
      const simpleGrid = screen.getByTestId('simple-grid');
      expect(simpleGrid).toBeInTheDocument();
      expect(simpleGrid.getAttribute('data-mb')).toBe('xl');
    });

    it('should render VerifierDashboardSkeleton correctly', () => {
      render(<VerifierDashboardSkeleton />);

      // Check for the verifier-dashboard-skeleton container
      const verifierDashboard = screen.getByTestId('verifier-dashboard-skeleton');
      expect(verifierDashboard).toBeInTheDocument();

      // Should include SimpleGrid
      const simpleGrid = screen.getByTestId('simple-grid');
      expect(simpleGrid).toBeInTheDocument();
      expect(simpleGrid.getAttribute('data-mb')).toBe('xl');

      // Should include papers
      const papers = screen.getAllByTestId('paper');
      expect(papers.length).toBeGreaterThan(0);

      // All papers should have the withBorder attribute
      papers.forEach(paper => {
        expect(paper.getAttribute('data-withborder')).toBe('true');
      });
    });
  });

  describe('DashboardSkeleton', () => {
    it('should return null when no userRole is provided', () => {
      const { container } = render(<DashboardSkeleton />);
      expect(container.innerHTML).toBe('');
    });

    it('should render for issuer role', () => {
      render(<DashboardSkeleton userRole="issuer" />);

      // Check for Container
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();
      expect(container.getAttribute('data-size')).toBe('xl');
      expect(container.getAttribute('data-py')).toBe('xl');

      // Should include WelcomeCardSkeleton
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].getAttribute('data-shadow')).toBe('sm');

      // Look for the issuer dashboard content
      // Since we're not mocking our components anymore, we need to look for elements
      // that would be rendered by the IssuerDashboardSkeleton
      const issuerDashboard = screen.getByTestId('issuer-dashboard-skeleton');
      expect(issuerDashboard).toBeInTheDocument();
    });

    it('should render for holder role', () => {
      render(<DashboardSkeleton userRole="holder" />);

      // Check for Container
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();

      // Should include WelcomeCardSkeleton
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].getAttribute('data-shadow')).toBe('sm');

      // Should include QuickActionsSkeleton
      const papers = screen.getAllByTestId('paper');
      expect(papers.length).toBeGreaterThan(0);

      // Look for the holder dashboard content
      const holderDashboard = screen.getByTestId('holder-dashboard-skeleton');
      expect(holderDashboard).toBeInTheDocument();

      // Check for ProgressBarsSkeleton
      const boxes = screen.getAllByTestId('box');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it('should render for verifier role', () => {
      render(<DashboardSkeleton userRole="verifier" />);

      // Check for Container
      const container = screen.getByTestId('container');
      expect(container).toBeInTheDocument();

      // Should include WelcomeCardSkeleton
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
      expect(cards[0].getAttribute('data-shadow')).toBe('sm');

      // Should include QuickActionsSkeleton with 3 columns for verifier
      const papers = screen.getAllByTestId('paper');
      const quickActionsPaper = papers.find(
        p => within(p).queryAllByTestId('simple-grid').length > 0,
      );
      if (quickActionsPaper) {
        const quickActionsGrid = within(quickActionsPaper).getByTestId('simple-grid');
        const colsData = JSON.parse(quickActionsGrid.getAttribute('data-cols') || '{}');
        expect(colsData).toHaveProperty('sm', 3);
      }

      // Check for verifier dashboard content
      const verifierDashboard = screen.getByTestId('verifier-dashboard-skeleton');
      expect(verifierDashboard).toBeInTheDocument();
    });
  });
});

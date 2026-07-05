import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LazyImage from '../../src/components/ui/LazyImage';

describe('LazyImage Component', () => {
  it('renders a skeleton placeholder initially', () => {
    render(<LazyImage src="test.jpg" alt="Test Image" />);
    // The skeleton is the only child of the wrapper before load, except the image itself
    const image = screen.getByRole('img');
    expect(image).toHaveClass('opacity-0');
    expect(image).toHaveAttribute('src', 'test.jpg');
    expect(image).toHaveAttribute('alt', 'Test Image');
  });

  it('removes skeleton and shows image on load', () => {
    render(<LazyImage src="test.jpg" alt="Test Image" />);
    const image = screen.getByRole('img');
    
    // Simulate image load
    fireEvent.load(image);
    
    // After load, it should transition to visible
    expect(image).toHaveClass('opacity-100');
  });

  it('shows error state when image fails to load', () => {
    render(<LazyImage src="invalid.jpg" alt="Broken Image" />);
    const image = screen.getByRole('img');
    
    // Simulate image error
    fireEvent.error(image);
    
    // Error placeholder text should appear
    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });
});

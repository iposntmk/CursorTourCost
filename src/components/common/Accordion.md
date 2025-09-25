# Accordion Component

A reusable accordion component for organizing large content blocks with expand/collapse functionality.

## Features

- ✅ Smooth expand/collapse animations
- ✅ Single or multiple item expansion modes
- ✅ Full keyboard navigation support
- ✅ ARIA accessibility attributes
- ✅ Customizable styling
- ✅ TypeScript support
- ✅ Compound component pattern for easy usage

## Basic Usage

```tsx
import { Accordion } from '../components/common/Accordion';

<Accordion>
  <Accordion.Item title="Section 1">
    <p>Content for section 1</p>
  </Accordion.Item>
  
  <Accordion.Item title="Section 2">
    <p>Content for section 2</p>
  </Accordion.Item>
</Accordion>
```

## Advanced Usage

### Multiple Items Open

```tsx
<Accordion allowMultiple defaultOpenItems={[0, 2]}>
  <Accordion.Item title="Always Open">
    <p>This item is open by default</p>
  </Accordion.Item>
  
  <Accordion.Item title="Closed by Default">
    <p>This item starts closed</p>
  </Accordion.Item>
  
  <Accordion.Item title="Also Open">
    <p>This item is also open by default</p>
  </Accordion.Item>
</Accordion>
```

### Disabled Items

```tsx
<Accordion>
  <Accordion.Item title="Normal Item">
    <p>This item can be toggled</p>
  </Accordion.Item>
  
  <Accordion.Item title="Disabled Item" disabled>
    <p>This item cannot be toggled</p>
  </Accordion.Item>
</Accordion>
```

### Custom Styling

```tsx
<Accordion className="space-y-4">
  <Accordion.Item 
    title="Custom Styled Item"
    headerClassName="bg-blue-50 hover:bg-blue-100"
    contentClassName="bg-blue-25"
  >
    <p>Content with custom styling</p>
  </Accordion.Item>
</Accordion>
```

## Props

### Accordion Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Accordion items |
| `className` | `string` | - | Additional CSS classes |
| `allowMultiple` | `boolean` | `false` | Allow multiple items to be open |
| `defaultOpenItems` | `number[]` | `[]` | Indexes of items to open by default |

### AccordionItem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | - | Title text for the accordion header |
| `children` | `ReactNode` | - | Content to display when expanded |
| `defaultOpen` | `boolean` | `false` | Whether item starts open (ignored if using Accordion defaultOpenItems) |
| `disabled` | `boolean` | `false` | Disable the accordion item |
| `className` | `string` | - | Additional CSS classes for the item container |
| `headerClassName` | `string` | - | Additional CSS classes for the header |
| `contentClassName` | `string` | - | Additional CSS classes for the content |

## Accessibility

The accordion component includes proper ARIA attributes:

- `aria-expanded`: Indicates whether the accordion item is expanded
- `aria-disabled`: Indicates whether the accordion item is disabled
- `aria-hidden`: Hides/shows content for screen readers
- Keyboard navigation: Enter and Space keys toggle accordion items
- Focus management: Proper focus indicators and keyboard traversal

## Styling

The accordion uses Tailwind CSS classes and follows the existing design system:

- Border: `border-slate-200`
- Background: `bg-white`
- Hover states: `hover:bg-slate-50`
- Focus states: `focus:ring-primary-400`
- Transitions: Smooth 300ms animations

## Examples in the App

The accordion is currently used in the Dashboard page to organize:
- System statistics
- Configuration details
- Activity history
- Usage instructions

This helps keep the dashboard organized while allowing users to focus on specific sections of information.
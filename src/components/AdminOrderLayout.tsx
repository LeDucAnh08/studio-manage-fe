import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Check } from 'lucide-react';
import '../styles/admin-order.css';

export function AdminOrderSteps({
  milestones,
  current,
  completed,
}: {
  milestones: readonly string[];
  current: number;
  completed: boolean;
}) {
  if (current < 0) return null;
  return (
    <ol className="admin-order__progress" aria-label="Tiến độ đơn">
      {milestones.map((label, index) => {
        const done = index < current || completed;
        return (
          <li
            key={label}
            data-step={done ? 'done' : index === current ? 'current' : 'upcoming'}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="admin-order__marker" aria-hidden="true">
              {done && <Check size={14} />}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

export function AdminOrderTabs({
  labels,
  value,
  onChange,
  overview,
  panels,
}: {
  labels: Record<string, string>;
  value: string;
  onChange: (tab: string) => void;
  overview: (openTab: (tab: string) => void) => ReactNode;
  panels: Record<string, ReactNode>;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [focusRequest, setFocusRequest] = useState<{ tab: string }>();
  useEffect(() => {
    if (focusRequest) {
      list.current
        ?.querySelector<HTMLButtonElement>(`[data-order-tab="${focusRequest.tab}"]`)
        ?.focus();
    }
  }, [focusRequest]);
  const openTab = (tab: string) => {
    onChange(tab);
    setFocusRequest({ tab });
  };
  return (
    <Tabs.Root value={value} onValueChange={onChange}>
      <Tabs.List ref={list} className="admin-order__tabs" aria-label="Nội dung hồ sơ">
        {Object.entries(labels).map(([tab, label]) => (
          <Tabs.Trigger key={tab} value={tab} data-order-tab={tab}>
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="overview" className="admin-order__panel">
        {overview(openTab)}
      </Tabs.Content>
      {Object.entries(panels).map(([tab, body]) => (
        <Tabs.Content key={tab} forceMount value={tab} className="admin-order__panel space-y-4">
          {body}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

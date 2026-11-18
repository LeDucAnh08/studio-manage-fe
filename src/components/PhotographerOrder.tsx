import { useState, type ReactNode } from 'react';
import { CalendarDays, Camera, History, MapPin } from 'lucide-react';
import { Button } from '@/components/ui';
import { AdminOrderSteps, AdminOrderTabs } from './AdminOrderLayout';
import '../styles/photographer-order.css';

const tabs = {
  overview: 'Tổng quan',
  schedule: 'Lịch & ekip',
  delivery: 'Bàn giao',
  history: 'Lịch sử',
};
const yearbookSteps = ['Đã chốt lịch', 'Chụp ảnh', 'Hậu kỳ', 'Bàn giao'];
const conceptSteps = ['Đã chốt lịch', 'Chụp ảnh', 'Bàn giao'];
const time = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

interface Props {
  service: 'yearbook' | 'concept';
  title: string;
  orderId: string;
  subtitle?: string;
  status: string;
  step: number;
  completed?: boolean;
  schedule: { label: string; date: string; hours?: string; location?: string };
  crew: Array<{ id: string; name: string; role: string; self?: boolean }>;
  task: { title: string; detail?: string; action?: ReactNode; openDelivery?: boolean };
  events: Array<{ action: string; at: string; message: string }>;
  scheduleDetails: ReactNode;
  delivery: ReactNode;
}

export function PhotographerOrder({
  service,
  title,
  orderId,
  subtitle,
  status,
  step,
  completed = false,
  schedule,
  crew,
  task,
  events,
  scheduleDetails,
  delivery,
}: Props) {
  const [tab, setTab] = useState('overview');
  const latest = events[0];
  const shoot = (
    <section className="admin-order__card photographer-order__shoot" aria-label="Lịch chụp và ekip">
      <div className="photographer-order__fact">
        <CalendarDays aria-hidden="true" />
        <div>
          <span>{schedule.label}</span>
          <strong>{[schedule.date, schedule.hours].filter(Boolean).join(' · ')}</strong>
        </div>
      </div>
      {schedule.location && (
        <div className="photographer-order__fact">
          <MapPin aria-hidden="true" />
          <div>
            <span>Địa điểm</span>
            <strong>{schedule.location}</strong>
          </div>
        </div>
      )}
      <div className="photographer-order__crew">
        <h2>Ekip chụp</h2>
        {crew.length ? (
          <ul>
            {crew.map((person) => (
              <li key={person.id}>
                <span className="photographer-order__avatar" aria-hidden="true">
                  {person.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <span className="photographer-order__role">
                    {person.role}
                    {person.self && ' · Bạn'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có thông tin phân công.</p>
        )}
      </div>
    </section>
  );
  return (
    <div className={`admin-order photographer-order photographer-order--${service}`}>
      <header className="admin-order__header">
        <div className="photographer-order__title">
          <h1>{title}</h1>
          <span className="photographer-order__status">{status}</span>
        </div>
        <p className="admin-order__meta">
          {[
            service === 'yearbook' ? 'Kỉ yếu' : 'Concept',
            '#' + orderId.slice(-6).toUpperCase(),
            subtitle,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>
      <AdminOrderSteps
        milestones={service === 'yearbook' ? yearbookSteps : conceptSteps}
        current={step}
        completed={completed}
      />
      <AdminOrderTabs
        labels={tabs}
        value={tab}
        onChange={setTab}
        overview={(openTab) => (
          <div className="admin-order__overview photographer-order__overview">
            {shoot}
            <aside className="admin-order__card photographer-order__task">
              <h2>Việc cần làm</h2>
              <div className="photographer-order__task-row">
                <span className="photographer-order__avatar">
                  <Camera size={22} aria-hidden="true" />
                </span>
                <div>
                  <strong>{task.title}</strong>
                  {task.detail && <p>{task.detail}</p>}
                </div>
              </div>
              {task.openDelivery ? (
                <Button type="button" onClick={() => openTab('delivery')}>
                  Xem ảnh bàn giao
                </Button>
              ) : (
                task.action
              )}
              {latest && (
                <section className="photographer-order__recent">
                  <h3>Hoạt động gần đây</h3>
                  <p>
                    <History size={17} aria-hidden="true" />
                    <span>
                      <time dateTime={latest.at}>{time.format(new Date(latest.at))}</time> ·{' '}
                      {latest.message}
                    </span>
                  </p>
                </section>
              )}
            </aside>
          </div>
        )}
        panels={{
          schedule: (
            <>
              {shoot}
              {scheduleDetails}
            </>
          ),
          delivery,
          history: (
            <section className="admin-order__card">
              <h2>Lịch sử xử lý</h2>
              {events.length ? (
                <ol className="photographer-order__history">
                  {events.map((event, index) => (
                    <li key={`${event.action}-${event.at}-${index}`}>
                      <time dateTime={event.at}>{time.format(new Date(event.at))}</time>
                      <p>{event.message}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Chưa có cập nhật.</p>
              )}
            </section>
          ),
        }}
      />
    </div>
  );
}

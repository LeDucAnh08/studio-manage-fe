import { useEffect, useState, type ReactNode } from 'react';
import type { PublicPhotographer } from '../services/conceptService';
import api from '../services/api';
import { CustomerImage } from './customer/CustomerImage';
import '../styles/concept-photographer.css';

export function PortfolioImage({
  privateMedia = false,
  ...props
}: Parameters<typeof CustomerImage>[0] & { privateMedia?: boolean }) {
  const [loaded, setLoaded] = useState<{ source: string; url: string } | null>(null);
  const [failed, setFailed] = useState('');
  const secure = privateMedia && props.src.startsWith('/api/photographers/');
  useEffect(() => {
    if (!secure) return;
    const abort = new AbortController();
    let url = '';
    api
      .get<Blob>(props.src.slice(4), { responseType: 'blob', signal: abort.signal })
      .then((r) => {
        if (!abort.signal.aborted) {
          url = URL.createObjectURL(r.data);
          setLoaded({ source: props.src, url });
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setFailed(props.src);
      });
    return () => {
      abort.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [secure, props.src]);
  if (secure && loaded?.source !== props.src)
    return (
      <div className="portfolio-image-status" role="status">
        {failed === props.src ? 'Không tải được ảnh' : 'Đang tải ảnh…'}
      </div>
    );
  return <CustomerImage {...props} src={secure ? loaded!.url : props.src} />;
}

/** One renderer for the public page, booking profile and private draft previews. */
export default function PhotographerPortfolio({
  profile,
  compact = false,
  privateMedia = false,
  actions,
}: {
  profile: PublicPhotographer;
  compact?: boolean;
  privateMedia?: boolean;
  actions?: ReactNode;
}) {
  const Heading = compact ? 'h2' : 'h1';
  const photo = { privateMedia };
  return (
    <div className={`photographer-profile${compact ? ' photographer-profile--compact' : ''}`}>
      {profile.coverUrl && (
        <PortfolioImage
          {...photo}
          src={profile.coverUrl}
          alt={`Ảnh bìa portfolio của ${profile.name}`}
          width={1200}
          height={350}
          className="photographer-profile-cover"
          priority
        />
      )}
      <header
        className={`photographer-hero${!profile.portraitUrl ? ' photographer-hero--text' : ''}`}
      >
        {profile.portraitUrl && (
          <PortfolioImage
            {...photo}
            src={profile.portraitUrl}
            alt={`Chân dung ${profile.name}`}
            width={340}
            height={440}
            priority
          />
        )}
        <div className="photographer-identity">
          <p className="photographer-eyebrow">Nhiếp ảnh gia tại Yume Studio</p>
          <Heading className="photographer-name">{profile.name}</Heading>
          {(profile.title || profile.concepts.length > 0) && (
            <p className="photographer-role">
              {profile.title || profile.concepts.map((c) => c.name).join(' · ')}
            </p>
          )}
          {profile.tagline && <h2>{profile.tagline}</h2>}
          {profile.bio && <p className="photographer-intro">{profile.bio}</p>}
          {profile.story && profile.story !== profile.bio && (
            <div className="photographer-prose">
              {profile.story.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          )}
          <dl className="photographer-facts">
            {[
              { label: 'Sở trường', value: profile.specialty },
              { label: 'Phong cách', value: profile.style },
              { label: 'Cách hướng dẫn', value: profile.guidance },
            ]
              .filter((item) => item.value?.trim())
              .map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
          </dl>
          {actions}
        </div>
      </header>
      {(profile.philosophy || !!profile.approach?.length) && (
        <section className="photographer-section photographer-working">
          {profile.philosophy && (
            <div>
              <h2>Điều tôi chú trọng</h2>
              <p className="photographer-prose">{profile.philosophy}</p>
            </div>
          )}
          {!!profile.approach?.length && (
            <div>
              <h2>Buổi chụp cùng tôi</h2>
              {profile.approach.map((item, i) => (
                <article key={i}>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {(
        [
          { key: 'audience', title: 'Phù hợp nếu bạn…' },
          { key: 'milestones', title: 'Dấu mốc & kinh nghiệm' },
        ] as const
      ).map(
        ({ key, title }) =>
          !!profile[key]?.length && (
            <section className="photographer-section" key={key}>
              <h2>{title}</h2>
              <div className="photographer-audience">
                {profile[key]!.map((item, i) => (
                  <article key={i}>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </article>
                ))}
              </div>
            </section>
          ),
      )}
      {!!profile.portfolio.length && (
        <section className="photographer-section photographer-gallery">
          <h2>Một số bộ ảnh tiêu biểu</h2>
          <p className="photographer-section-intro">
            Góc nhìn thể hiện qua ánh sáng, bố cục và biểu cảm.
          </p>
          <div className="photographer-work-grid">
            {(compact ? profile.portfolio.slice(0, 3) : profile.portfolio).map((item, i) => (
              <figure key={`${item.url}-${i}`}>
                <PortfolioImage
                  {...photo}
                  src={item.url}
                  alt={item.caption || `Tác phẩm của ${profile.name}`}
                  width={400}
                  height={300}
                />
                {item.caption && <figcaption>{item.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

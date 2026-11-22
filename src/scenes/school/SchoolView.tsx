import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import styles from './school.module.css';
import type { School } from './School';
import { SCHOOL } from '../../data/school';
import { imageUrl } from '../../assets/manifest';
import { DAYS, DAY_NAMES, SLOTS, timeOf } from '../../model/calendar';
import { dispositionBand } from '../../model/disposition';
import { BAND_NAMES, intelName, studentName } from '../../model/schoolText';
import { INTEL } from '../../data/school/intel';
import { ordinal, ROYALE_SIZE } from '../../model/royaleStub';
import { constellationLayout } from '../../model/constellation';
import { starStatus } from '../../model/school';
import { pointsToNextRank, rankOf, SOCIAL_STATS, SOCIAL_STAT_NAMES } from '../../model/socialStats';

type Props = { school: School };

export const SchoolView = observer(({ school }: Props): JSX.Element => (
  <motion.div className={styles.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
    <Header school={school} />
    <CampusMap school={school} />
    <LocationPanel school={school} />
    {school.store.result && <ResultCard school={school} />}
    {school.store.friday?.stage === 'briefing' && <BriefingCard school={school} />}
    {school.store.friday?.stage === 'results' && <RoyaleCard school={school} />}
    {school.store.constellationOpen && <ConstellationView school={school} />}
  </motion.div>
));

/** The week, day and slot, the calendar strip, gold and social stats. */
const Header = observer(({ school }: Props) => {
  const { now, state } = school;
  const { time, lostSlots } = state.calendar;
  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <span className={styles.title}>Week {now.week}: {DAY_NAMES[now.day]} {now.slot}</span>
        <span className={styles.gold}>{state.gold}g</span>
      </div>
      <div className={styles.titleRow}>
        <span className={styles.elo}>ELO {state.elo}</span>
        <button className={styles.headerButton} onClick={() => school.toggleConstellation()}>★ Constellation</button>
      </div>
      <div className={styles.calendar}>
        {DAYS.map((day) => (
          <div key={day} className={styles.day}>
            <div className={styles.dayName}>{DAY_NAMES[day].slice(0, 3)}</div>
            <div className={styles.slots}>
              {SLOTS.map((slot) => {
                const t = timeOf(now.week, day, slot);
                const status = lostSlots.includes(t) ? styles.lost : t < time ? styles.past : t === time ? styles.current : '';
                return <div key={slot} className={`${styles.slot} ${status}`} title={`${DAY_NAMES[day]} ${slot}`} />;
              })}
            </div>
          </div>
        ))}
        <div className={styles.day}>
          <div className={styles.dayName}>Fri</div>
          <div className={styles.royale}>⚔</div>
        </div>
      </div>
      <div className={styles.stats}>
        {SOCIAL_STATS.map((stat) => {
          const points = state.stat(stat);
          const next = pointsToNextRank(points);
          return (
            <div key={stat} className={styles.stat}>
              {SOCIAL_STAT_NAMES[stat]} <b>{rankOf(points)}</b>
              <span className={styles.statNext}>{next === null ? ' max' : ` (${next} to go)`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/** Every location as a tile, with who's there this slot. */
const CampusMap = observer(({ school }: Props) => {
  const where = school.where;
  const open = school.openLocations;
  const selected = school.store.location;
  return (
    <div className={styles.map}>
      {Object.entries(SCHOOL.locations).map(([id, location]) => {
        const isOpen = open.includes(id);
        const present = Object.keys(where).filter((student) => where[student] === id);
        const hasStar = isOpen && school.options(id).some((option) => option.kind === 'star');
        return (
          <button
            key={id}
            className={`${styles.tile} ${selected === id ? styles.selected : ''}`}
            disabled={!isOpen}
            onClick={() => school.selectLocation(selected === id ? null : id)}
          >
            <div className={styles.tileName}>
              {location.name}
              {hasStar && <span className={styles.starMark}> ★</span>}
            </div>
            {!isOpen && <div className={styles.closed}>closed</div>}
            <div className={styles.students}>
              {present.map((student) => <StudentChip key={student} school={school} student={student} />)}
            </div>
          </button>
        );
      })}
    </div>
  );
});

/** A student's face, name and how they feel about the player. */
const StudentChip = observer(({ school, student }: Props & { student: string }) => {
  const band = dispositionBand(school.state.disposition(student));
  const art = imageUrl(`characters/${student}`);
  return (
    <div className={`${styles.chip} ${styles[band]}`} title={BAND_NAMES[band]}>
      {art && <img className={styles.face} src={art} alt="" />}
      <span>{SCHOOL.students[student].name}</span>
    </div>
  );
});

/** What can be done at the selected location. */
const LocationPanel = observer(({ school }: Props) => {
  const { location, notice } = school.store;
  if (!location) {
    return <div className={styles.panel}><div className={styles.hint}>Pick a place to spend your {school.now.slot}.</div></div>;
  }
  const options = school.options(location);
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>{SCHOOL.locations[location].name}</div>
      {notice && notice.length > 0 && (
        <div className={styles.notice}>{notice.map((change, i) => <div key={i}>{school.describe(change)}</div>)}</div>
      )}
      <div className={styles.options}>
        {options.length === 0 && <div className={styles.hint}>Nothing to do here right now.</div>}
        {options.map((option, i) => {
          const free = option.kind === 'activity' && SCHOOL.activities[option.activity].free;
          return (
            <button
              key={i}
              className={`${styles.option} ${option.kind === 'star' ? styles.starOption : ''}`}
              onClick={() => school.pick(option)}
            >
              {school.optionName(option)}
              {free && <span className={styles.free}> (free)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
});

/** What the slot's activity did, a gift for the student involved, and on to the next slot. */
const ResultCard = observer(({ school }: Props) => {
  const result = school.store.result!;
  const gifts = Object.keys(school.state.inventory);
  const next = result.usedSlot && school.now.lastOfWeek ? 'On to Friday' : 'Continue';
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>{result.title}</div>
        <div className={styles.changes}>
          {result.changes.length === 0 && <div>Nothing much came of it.</div>}
          {result.changes.map((change, i) => <div key={i}>{school.describe(change)}</div>)}
        </div>
        {result.student && !result.giftGiven && gifts.length > 0 && (
          <div className={styles.gifts}>
            <div className={styles.giftTitle}>Give {SCHOOL.students[result.student].name} a gift?</div>
            {gifts.map((item) => (
              <button key={item} className={styles.option} onClick={() => school.gift(item)}>
                {SCHOOL.items[item].name} ×{school.state.items(item)}
              </button>
            ))}
          </div>
        )}
        <button className={styles.continue} onClick={() => school.continue()}>{next}</button>
      </div>
    </div>
  );
});

/** Thursday night: everything the player learned about Friday's match. */
const BriefingCard = observer(({ school }: Props) => {
  const intel = school.state.intel;
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>The night before the royale</div>
        <div className={styles.giftTitle}>What you know about Friday:</div>
        <div className={styles.changes}>
          {intel.length === 0 && <div>Nothing. You go in blind.</div>}
          {intel.map((id) => <div key={id}>{intelName(SCHOOL, INTEL, id)}</div>)}
        </div>
        <button className={styles.continue} onClick={() => school.continue()}>To the royale</button>
      </div>
    </div>
  );
});

/** Friday's results. Made up by `stubRoyale` until the royale exists. */
const RoyaleCard = observer(({ school }: Props) => {
  const friday = school.store.friday;
  if (friday?.stage !== 'results') return null;
  const { result } = friday;
  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Friday: the royale</div>
        <div className={styles.giftTitle}>(Placeholder results until the royale exists.)</div>
        <div className={styles.changes}>
          <div>You placed {ordinal(result.placement)} of {ROYALE_SIZE}</div>
          <div>ELO {result.elo >= 0 ? '+' : ''}{result.elo}, now {school.state.elo}</div>
          <div>Gold +{result.gold}</div>
          {result.history.map(({ student, event }) => (
            <div key={student}>{studentName(SCHOOL, student)} won&apos;t forget: {event}</div>
          ))}
        </div>
        <button className={styles.continue} onClick={() => school.continue()}>Week {school.now.week}</button>
      </div>
    </div>
  );
});

/** Every relationship as a web of stars: lit, ready to play, or dim with a hint. */
const ConstellationView = observer(({ school }: Props) => {
  const layout = React.useMemo(() => constellationLayout(SCHOOL), []);
  const at = new Map(layout.nodes.map((node) => [node.id, node]));
  const selected = school.store.selectedStar;
  const statusOf = (star: string) => starStatus(SCHOOL, star, school.state);
  return (
    <div className={styles.constellation}>
      <div className={styles.titleRow}>
        <span className={styles.title}>Constellation</span>
        <button className={styles.headerButton} onClick={() => school.toggleConstellation()}>Close</button>
      </div>
      <svg className={styles.sky} viewBox="-1.05 -1.05 2.1 2.1">
        {layout.edges.map(({ from, to }) => {
          const a = at.get(from)!;
          const b = at.get(to)!;
          const lit = b.kind !== 'star' || statusOf(b.id) === 'lit';
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={lit ? styles.edgeLit : styles.edge} />;
        })}
        {layout.nodes.map((node) => {
          if (node.kind === 'player') {
            return <text key="player" x={0} y={0.03} className={styles.playerLabel}>you</text>;
          }
          if (node.kind === 'student') {
            const band = dispositionBand(school.state.disposition(node.id));
            return (
              <text key={node.id} x={node.x} y={node.y + 0.03} className={`${styles.studentLabel} ${styles[band]}`}>
                {SCHOOL.students[node.id].name}
              </text>
            );
          }
          const status = statusOf(node.id);
          return (
            <g key={node.id} onClick={() => school.selectStar(node.id)} className={styles.starNode}>
              <circle cx={node.x} cy={node.y} r={0.09} fill="transparent" />
              <text x={node.x} y={node.y + 0.035} className={`${styles.star} ${styles[status]} ${selected === node.id ? styles.picked : ''}`}>
                {status === 'dim' ? '☆' : '★'}
              </text>
            </g>
          );
        })}
      </svg>
      <StarDetails school={school} />
    </div>
  );
});

const StarDetails = observer(({ school }: Props) => {
  const id = school.store.selectedStar;
  if (!id) return <div className={styles.hint}>Tap a star. Bright stars are lit; yellow outlines are ready to play.</div>;
  const star = SCHOOL.stars[id];
  const status = starStatus(SCHOOL, id, school.state);
  return (
    <div className={styles.starDetails}>
      <div className={styles.panelTitle}>{status === 'dim' ? '???' : star.name}</div>
      <div className={styles.giftTitle}>
        {studentName(SCHOOL, star.student)}: {status === 'lit' ? 'lit' : status === 'ready' ? 'ready to play' : 'not yet'}
      </div>
      {status !== 'lit' && <div>{star.hint}</div>}
    </div>
  );
});

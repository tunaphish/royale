import * as React from 'react';
import { motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import story from '../story/story.module.css';
import styles from './school.module.css';
import type { School } from './School';
import { SCHOOL } from '../../data/school';
import { INTEL } from '../../data/school/intel';
import { imageUrl } from '../../assets/manifest';
import { DAYS, DAY_NAMES, SLOTS, timeOf } from '../../model/calendar';
import { constellationLayout } from '../../model/constellation';
import { dispositionBand } from '../../model/disposition';
import { ordinal, ROYALE_SIZE } from '../../model/royaleStub';
import { starStatus } from '../../model/school';
import { BAND_NAMES, intelName, studentName } from '../../model/schoolText';
import { pointsToNextRank, rankOf, SOCIAL_STATS, SOCIAL_STAT_NAMES } from '../../model/socialStats';
import { StageView, StoryBox } from '../story/StoryViews';

type Props = { school: School };

/** The story screen's layout: the stage on top, the message box below, the week's status along its bottom. */
export const SchoolView = observer(({ school }: Props): JSX.Element => (
  <motion.div className={story.container} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
    <StageView player={school.player}>
      {school.store.constellationOpen && !school.player.playing && <ConstellationSky school={school} />}
    </StageView>
    <div className={`${story.menu} ${styles.box}`}>
      <div className={styles.boxContent}>
        <BoxContent school={school} />
      </div>
      <StatusStrip school={school} />
    </div>
  </motion.div>
));

/** What the message box shows, most pressing first. */
const BoxContent = observer(({ school }: Props) => {
  const { store } = school;
  if (school.player.playing) return <StoryBox player={school.player} />;
  if (store.constellationOpen) return <StarDetails school={school} />;
  if (store.friday?.stage === 'briefing') return <Briefing school={school} />;
  if (store.friday?.stage === 'results') return <RoyaleResults school={school} />;
  if (store.result) return <Result school={school} />;
  if (store.location) return <LocationActions school={school} location={store.location} />;
  return <CampusMap school={school} />;
});

// #region Building blocks: lines and choices, styled like a story's

const Lines = ({ lines, dim }: { lines: string[]; dim?: boolean }) => (
  <div className={`${styles.lines} ${dim ? styles.dimLines : ''}`}>
    {lines.map((line, i) => <div key={i}>{line}</div>)}
  </div>
);

const ChoiceButton = ({ onClick, children, star, note }: { onClick: () => void; children: React.ReactNode; star?: boolean; note?: string }) => (
  <div className={`${story.optionDiv} ${star ? styles.starChoice : ''}`} onClick={onClick}>
    {children}
    {note && <span className={styles.note}> {note}</span>}
  </div>
);
// #endregion

/** Every location as a tile, with who's there this slot. */
const CampusMap = observer(({ school }: Props) => {
  const open = school.openLocations;
  return (
    <div className={styles.map}>
      {Object.entries(SCHOOL.locations).map(([id, location]) => {
        const isOpen = open.includes(id);
        const hasStar = isOpen && school.options(id).some((option) => option.kind === 'star');
        return (
          <button key={id} className={styles.tile} disabled={!isOpen} onClick={() => school.selectLocation(id)}>
            <span className={styles.tileName}>
              {location.name}
              {hasStar && <span className={styles.starMark}> ★</span>}
            </span>
            <span className={styles.faces}>
              {school.studentsAt(id).map((student) => <Face key={student} school={school} student={student} />)}
            </span>
          </button>
        );
      })}
    </div>
  );
});

/** A student's face, ringed in the color of how they feel about the player. */
const Face = observer(({ school, student }: Props & { student: string }) => {
  const band = dispositionBand(school.state.disposition(student));
  const art = imageUrl(`characters/${student}`);
  const name = SCHOOL.students[student].name;
  return art
    ? <img className={`${styles.face} ${styles[band]}`} src={art} alt={name} title={`${name}: ${BAND_NAMES[band]}`} />
    : <span className={`${styles.faceName} ${styles[band]}`}>{name}</span>;
});

/** What can be done at a location, and the way back to the map. */
const LocationActions = observer(({ school, location }: Props & { location: string }) => {
  const here = school.studentsAt(location).map((student) => studentName(SCHOOL, student));
  const who = here.length === 0 ? 'Nobody you know is here.' : `${here.join(' and ')} ${here.length === 1 ? 'is' : 'are'} here.`;
  const notice = school.store.notice;
  return (
    <>
      <Lines lines={[`${SCHOOL.locations[location].name}. ${who}`]} />
      {notice && notice.length > 0 && <Lines lines={notice.map(school.describe)} dim />}
      <div className={styles.choices}>
        {school.options(location).map((option, i) => {
          const free = option.kind === 'activity' && SCHOOL.activities[option.activity].free;
          return (
            <ChoiceButton key={i} onClick={() => school.pick(option)} star={option.kind === 'star'} note={free ? '(free)' : undefined}>
              {school.optionName(option)}
            </ChoiceButton>
          );
        })}
        <ChoiceButton onClick={() => school.selectLocation(null)}>Back</ChoiceButton>
      </div>
    </>
  );
});

/** What the slot's activity did, a gift for the student involved, and on to the next slot. */
const Result = observer(({ school }: Props) => {
  const result = school.store.result!;
  const gifts = Object.keys(school.state.inventory);
  const canGift = result.student && !result.giftGiven && gifts.length > 0;
  const lines = result.changes.length > 0 ? result.changes.map(school.describe) : ['Nothing much came of it.'];
  return (
    <>
      <Lines lines={[`${result.title}.`]} dim />
      <Lines lines={lines} />
      <div className={styles.choices}>
        {canGift && gifts.map((item) => (
          <ChoiceButton key={item} onClick={() => school.gift(item)} note={`×${school.state.items(item)}`}>
            Give {studentName(SCHOOL, result.student!)} the {SCHOOL.items[item].name.toLowerCase()}
          </ChoiceButton>
        ))}
        <ChoiceButton onClick={() => school.continue()}>
          {result.usedSlot && school.now.lastOfWeek ? 'On to Friday' : 'Continue'}
        </ChoiceButton>
      </div>
    </>
  );
});

/** Thursday night: everything the player learned about Friday's match. */
const Briefing = observer(({ school }: Props) => {
  const intel = school.state.intel;
  return (
    <>
      <Lines lines={['The night before the royale. What you know about Friday:']} dim />
      <Lines lines={intel.length === 0 ? ['Nothing. You go in blind.'] : intel.map((id) => intelName(SCHOOL, INTEL, id))} />
      <div className={styles.choices}>
        <ChoiceButton onClick={() => school.continue()}>To the royale</ChoiceButton>
      </div>
    </>
  );
});

/** Friday's results. Made up by `stubRoyale` until the royale exists. */
const RoyaleResults = observer(({ school }: Props) => {
  const friday = school.store.friday;
  if (friday?.stage !== 'results') return null;
  const { result } = friday;
  return (
    <>
      <Lines lines={['Friday: the royale. (Placeholder results until the royale exists.)']} dim />
      <Lines lines={[
        `You placed ${ordinal(result.placement)} of ${ROYALE_SIZE}. ELO ${result.elo >= 0 ? '+' : ''}${result.elo}, now ${school.state.elo}. Gold +${result.gold}.`,
        ...result.history.map(({ student, event }) => `${studentName(SCHOOL, student)} won't forget: ${event}.`),
      ]} />
      <div className={styles.choices}>
        <ChoiceButton onClick={() => school.continue()}>On to week {school.now.week}</ChoiceButton>
      </div>
    </>
  );
});

/** The day, the week's slots, gold, ELO, stats, and the way into the constellation. */
const StatusStrip = observer(({ school }: Props) => {
  const { now, state } = school;
  const { time, lostSlots } = state.calendar;
  return (
    <div className={styles.status}>
      <div className={styles.statusRow}>
        <span className={styles.when}>Wk {now.week} {DAY_NAMES[now.day].slice(0, 3)} {now.slot === 'morning' ? 'AM' : 'PM'}</span>
        <span className={styles.calendar}>
          {DAYS.map((day) => SLOTS.map((slot) => {
            const t = timeOf(now.week, day, slot);
            const status = lostSlots.includes(t) ? styles.lost : t < time ? styles.past : t === time ? styles.current : '';
            return <span key={`${day}-${slot}`} className={`${styles.slot} ${status} ${slot === 'afternoon' ? styles.dayEnd : ''}`} />;
          }))}
          <span className={styles.royale}>⚔</span>
        </span>
        <span className={styles.gold}>{state.gold}g</span>
      </div>
      <div className={styles.statusRow}>
        <span className={styles.elo}>ELO {state.elo}</span>
        {SOCIAL_STATS.map((stat) => {
          const points = state.stat(stat);
          const next = pointsToNextRank(points);
          return (
            <span key={stat} className={styles.stat} title={next === null ? 'max rank' : `${next} to the next rank`}>
              {SOCIAL_STAT_NAMES[stat]} <b>{rankOf(points)}</b>
            </span>
          );
        })}
        <button
          className={`${styles.constellationButton} ${school.store.constellationOpen ? styles.active : ''}`}
          disabled={school.player.playing}
          onClick={() => school.toggleConstellation()}
        >
          ★
        </button>
      </div>
    </div>
  );
});

/** The constellation, drawn over the (empty) stage: lit, ready and dim stars around each student. */
const ConstellationSky = observer(({ school }: Props) => {
  const layout = React.useMemo(() => constellationLayout(SCHOOL), []);
  const at = new Map(layout.nodes.map((node) => [node.id, node]));
  const selected = school.store.selectedStar;
  const statusOf = (star: string) => starStatus(SCHOOL, star, school.state);
  return (
    <svg className={styles.sky} viewBox="-1.05 -1.05 2.1 2.1">
      {layout.edges.map(({ from, to }) => {
        const a = at.get(from)!;
        const b = at.get(to)!;
        const lit = b.kind !== 'star' || statusOf(b.id) === 'lit';
        return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={lit ? styles.edgeLit : styles.edge} />;
      })}
      {layout.nodes.map((node) => {
        if (node.kind === 'player') return <text key="player" x={0} y={0.03} className={styles.playerLabel}>you</text>;
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
  );
});

/** The picked star in the message box, and the way back. */
const StarDetails = observer(({ school }: Props) => {
  const id = school.store.selectedStar;
  let lines = ['The constellation. Tap a star: bright ones are lit, outlined ones are ready to play.'];
  if (id) {
    const star = SCHOOL.stars[id];
    const status = starStatus(SCHOOL, id, school.state);
    const where = status === 'lit' ? 'lit' : status === 'ready' ? 'ready to play' : 'not yet';
    lines = [`${status === 'dim' ? '???' : star.name}. ${studentName(SCHOOL, star.student)}: ${where}.`];
    if (status !== 'lit') lines.push(star.hint);
  }
  return (
    <>
      <Lines lines={lines} />
      <div className={styles.choices}>
        <ChoiceButton onClick={() => school.toggleConstellation()}>Back</ChoiceButton>
      </div>
    </>
  );
});

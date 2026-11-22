import * as React from 'react';
import { observer } from 'mobx-react-lite';

import styles from './story.module.css';
import { RichText } from '../ui/RichText';
import type { StoryPlayer } from './StoryPlayer';

/**
 * The stage's box. Phaser draws the background, character and foreground
 * (`StoryPlayer.stage`) inside it; this view reports where the box is, forwards
 * the pointer for parallax, and shows `#display` text on top. `children` draw
 * over the stage too (the school's constellation).
 */
export const StageView = observer((props: { player: StoryPlayer; children?: React.ReactNode }): JSX.Element => {
  const { player, children } = props;
  const { display, typing } = player.store;
  const stageRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const report = () => player.stage.setRectFromElement(element);
    report();
    // the box moves when the layout or the window changes size
    const observer = new ResizeObserver(report);
    observer.observe(element);
    window.addEventListener('resize', report);

    // pointer events cover both mouse and touch drags
    const onPointerMove = (e: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      player.stage.setParallax(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    element.addEventListener('pointermove', onPointerMove);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
      element.removeEventListener('pointermove', onPointerMove);
    };
  }, [player]);

  return (
    <div ref={stageRef} className={styles.stage}>
      {children}
      {display && (
        <div className={styles.displayText}>
          <RichText nodes={display.nodes} revealed={typing?.target === 'display' ? typing.revealed : undefined} />
        </div>
      )}
    </div>
  );
});

/** The message box's story content: the line being said, or the choices. */
export const StoryBox = observer(({ player }: { player: StoryPlayer }): JSX.Element =>
  player.store.choices ? <ChoicesView player={player} /> : <MessageView player={player} />,
);

/** The line in the message box; a tap finishes typing, then continues. */
export const MessageView = observer(({ player }: { player: StoryPlayer }): JSX.Element => {
  const { message, typing } = player.store;
  const isTyping = typing?.target === 'message';

  return (
    <div className={styles.actorMessage} onClick={() => player.advance()}>
      {message && (
        <div className={isTyping ? `${styles.actorDialogue} ${styles.typing}` : styles.actorDialogue}>
          <RichText nodes={message.nodes} revealed={isTyping ? typing.revealed : undefined} />
        </div>
      )}
    </div>
  );
});

export const ChoicesView = observer(({ player }: { player: StoryPlayer }): JSX.Element => (
  <div className={styles.dialogueOptions}>
    {player.store.choices?.map((choice) => (
      <div key={choice.index} className={styles.optionDiv} onClick={() => player.selectChoice(choice)}>
        <RichText nodes={choice.nodes} />
      </div>
    ))}
  </div>
));

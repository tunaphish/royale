import classNames from './battle.module.css';

export const Meter = (props: {
  value: number;
  max: number;
  className?: string;
  vertical?: boolean;
}): JSX.Element => {
  const { className, value, max, vertical } = props;

  const percent = Math.min(Math.round((value / max) * 100), 100) + "%";

  const style = vertical
    ? { height: percent }
    : { width: percent };

  return (
    <div className={classNames.meterBackground}>
      <div
        className={[classNames.meter, className].join(" ")}
        style={style}
      />
    </div>
  );
};
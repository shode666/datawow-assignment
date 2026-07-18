
import type { StatsResponse } from '@/lib/stats';

export type StatCardType = {
  key: keyof StatsResponse;
  label: string;
  icon: React.ReactNode;
  bg: string;
};

const StatCard = (props: {card: StatCardType, stat: number| null}) =>{

  const { stat, card} = props;
  const { key, label, icon, bg } = card;

  return (
    <div
              key={key}
              className="flex flex-col items-center gap-2 rounded-md px-4 py-6 text-white"
              style={{ backgroundColor: bg }}
            >
              <div className="text-2xl">{icon}</div>
              <div className="text-base">{label}</div>
              <div className="text-5xl font-light">
                {stat ?? '-'}
              </div>
            </div>
  )
}

export default StatCard;
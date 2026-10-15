import React, { ReactNode } from 'react';
import { MapPin, Clock3, CircleCheck } from 'lucide-react';
import { Job, Language } from '../types';
import { TRADES } from '../data/mockData';

interface JobListingCardProps {
  job: Job;
  language: Language;
  children: ReactNode;
  className?: string;
}

/** Shared job summary surface for listed work and the accepted-job arrival flow. */
export const JobListingCard: React.FC<JobListingCardProps> = ({ job, language, children, className = '' }) => {
  const trade = TRADES.find((item) => item.id === job.trade);
  const tradeName = language === 'hi' ? trade?.nameHi : trade?.nameEn;
  const title = language === 'hi' ? job.titleHi : job.title;
  const rateUnit = job.wageType === 'hourly' ? '/hour' : job.wageType === 'daily' ? '/day' : ' total';

  return (
    <article className={`relative w-full min-h-[208px] rounded-[22px] bg-white px-[15px] pt-[15px] pb-[10px] shadow-[0px_2px_20px_rgba(0,0,0,0.11)] ${className}`}>
      <span className="inline-flex h-[17px] max-w-[calc(100%-125px)] items-center gap-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[5px] bg-[rgba(3,192,60,0.22)] px-1 text-[10px] font-semibold leading-none text-[#03c03c]">
        <CircleCheck className="h-[12px] w-[12px] fill-[#03c03c] text-white" />
        {tradeName || job.categoryName}
      </span>
      <span className="ml-2 inline-flex max-w-[115px] shrink-0 rounded-[15px] bg-[rgba(45,89,240,0.16)] px-2 py-2.5 align-top text-[11px] font-bold leading-none text-[#2d59f0] sm:px-[9px] sm:text-[12px]">
        ₹{job.agreedAmount}{rateUnit}
      </span>
      <h3 className="mt-[10px] min-h-[38px] w-full pr-1 text-[16px] font-bold leading-[19px] text-black line-clamp-2">{title}</h3>
      <div className="mt-[9px] flex min-w-0 items-center gap-1 text-[10px] leading-[14px] text-[#b5b5b5]">
        <MapPin className="h-[13px] w-[13px] shrink-0 fill-[#b5b5b5] text-[#b5b5b5]" />
        <span className="truncate">{job.siteName}</span>
      </div>
      <div className="mt-[10px] flex flex-wrap items-center gap-[6px] text-[10px] font-semibold leading-[18px] text-[#b5b5b5] sm:gap-[10px]">
        <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
          <MapPin className="h-3 w-3 fill-[#b5b5b5]" />{job.distanceKm} km
        </span>
        <span className="inline-flex h-[18px] items-center gap-1 rounded-[5px] bg-[#f1f1f1] px-1.5">
          <Clock3 className="h-3 w-3" />{job.startTime} - {job.endTime}
        </span>
      </div>
      <div className="mt-[10px]">{children}</div>
    </article>
  );
};

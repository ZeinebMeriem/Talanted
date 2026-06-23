import React, { useState } from 'react';
import { Star, ArrowLeft, ArrowRight } from 'lucide-react';

interface LandingReviewsProps {
  showToast: (msg: string) => void;
}

const REVIEWS = [
  {
    id: 1,
    rating: 3,
    text: "Talented is my new go-to app for all my online banking needs. It's very easy to use and my money is very secure.",
    name: 'Harry Gomez',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    fallbackEmoji: '👨‍💻',
  },
  {
    id: 2,
    rating: 5,
    text: "I've saved so many bucks with Talented! Definitely changed the way I think about how I use my money.",
    name: 'Helena Croft',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    fallbackEmoji: '👩‍💻',
  },
  {
    id: 3,
    rating: 5,
    text: 'The Multi-Agent pipeline is absolutely brilliant. It saved our development team hundreds of engineering hours.',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
    fallbackEmoji: '👩‍💼',
  },
  {
    id: 4,
    rating: 4,
    text: 'We integrated our Figma workflows seamlessly. The WCAG auditing agent caught high contrast issues before code was deployed.',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    fallbackEmoji: '👨',
  },
];

export default function LandingReviews({ showToast }: LandingReviewsProps) {
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const navigate = (next: number) => {
    setVisible(false);
    setTimeout(() => {
      setActiveReviewIndex(next);
      setVisible(true);
    }, 200);
  };

  const handlePrev = () => navigate(activeReviewIndex === 0 ? 2 : 0);
  const handleNext = () => navigate(activeReviewIndex === 0 ? 2 : 0);

  const visibleReviews = REVIEWS.slice(activeReviewIndex, activeReviewIndex + 2);

  return (
    <section
      className="py-20 lg:py-24 bg-[#04081c] text-white relative z-10 w-full overflow-hidden"
      id="reviews-section"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left Column */}
          <div className="lg:col-span-4 text-left space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-normal tracking-tight text-white font-sans leading-tight">
              Check out these awesome reviews
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-md">
              Not convinced yet? Check out some of these awesome reviews and see for yourself why people love Talented.
            </p>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8 flex flex-col gap-6 relative">
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200"
              style={{ opacity: visible ? 1 : 0 }}
            >
              {visibleReviews.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0e142e] border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-[250px] sm:h-[280px] hover:border-slate-700 transition-all shadow-lg"
                >
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < item.rating
                              ? 'fill-[#7c3aed] text-[#7c3aed]'
                              : 'text-slate-600 fill-none'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed text-left">
                      {item.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-10 h-10 rounded-full border border-slate-700 overflow-hidden flex items-center justify-center bg-slate-800 text-lg relative shrink-0">
                      <img
                        src={item.avatar}
                        alt={item.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fb = e.currentTarget.parentElement?.querySelector('.fb-emoji');
                          if (fb) (fb as HTMLElement).style.display = 'block';
                        }}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="fb-emoji" style={{ display: 'none' }}>{item.fallbackEmoji}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-white">{item.name}</h4>
                  </div>
                </div>
              ))}
            </div>

            {/* Slider Controls */}
            <div className="flex items-center justify-end gap-3 mt-2 pr-2">
              <button
                onClick={handlePrev}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeReviewIndex === 0
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  activeReviewIndex === 2
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9]'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

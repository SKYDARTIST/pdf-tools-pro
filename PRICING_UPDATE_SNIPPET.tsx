// REPLACEMENT FOR LINES 196-207 in PricingScreen.tsx
// This adds the strike-through pricing and scarcity messaging

                    ) : (
    <div className="flex flex-col gap-2">
        {tier.id === SubscriptionTier.LIFETIME && (
            <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-400 line-through decoration-2">
                    $29.99
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-md bg-[#00C896]/10 text-[#00C896] animate-pulse">
                    83% OFF
                </span>
            </div>
        )}
        <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-black dark:text-white">
                {tier.price}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {tier.period}
            </span>
        </div>
        {tier.id === SubscriptionTier.LIFETIME && (
            <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider text-[#00C896]">
                    First 500 users • Limited spots remaining
                </span>
            </div>
        )}
    </div>
)}

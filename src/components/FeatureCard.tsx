
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  path: string;
  color: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, path, color, delay = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate(path)}
      className="flex flex-col items-start p-5 bg-white rounded-3xl shadow-sm border border-slate-100 w-full text-left transition-all hover:shadow-md active:bg-slate-50"
    >
      <div className={`p-3 rounded-2xl mb-4 ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </motion.button>
  );
};

export default FeatureCard;

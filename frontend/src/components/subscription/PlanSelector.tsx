import React, { useState } from 'react';
import type { Plan } from '../../types/subscription.types';
import { Check } from 'lucide-react';

interface PlanSelectorProps {
  plans: Plan[];
  currentPlanId?: number;
  onSelectPlan: (plan: Plan) => void;
}

export const PlanSelector: React.FC<PlanSelectorProps> = ({
  plans,
  currentPlanId,
  onSelectPlan,
}) => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  
  // Filter plans based on selected interval
  const filteredPlans = plans.filter(plan => plan.interval === billingInterval);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Billing Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex items-center">
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingInterval === 'month'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setBillingInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
              billingInterval === 'year'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setBillingInterval('year')}
          >
            Yearly
            <span className="ml-1.5 text-green-600 text-xs font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
              plan.id === currentPlanId ? 'ring-2 ring-blue-600' : ''
            }`}
          >
            {plan.id === currentPlanId && (
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                Current Plan
              </div>
            )}
            
            <div className="p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
              <div className="flex items-baseline mb-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  ${parseFloat(plan.price.toString()).toFixed(2)}
                </span>
                <span className="text-gray-500 ml-2 text-sm">
                  /{billingInterval === 'month' ? 'mo' : 'yr'}
                </span>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 pt-0">
              <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-center transition-all duration-200 ${
                  plan.id === currentPlanId
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                }`}
                disabled={plan.id === currentPlanId}
              >
                {plan.id === currentPlanId ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

'use client';

import { useState } from 'react';
import { testScenarios, scenarioCategories, getScenariosByCategory, getRandomScenario } from '@/lib/utils/testScenarios';
import type { TestScenario } from '@/lib/utils/testScenarios';

interface TestPanelProps {
  onSelectBarcode: (barcode: string) => void;
}

export default function TestPanel({ onSelectBarcode }: TestPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof scenarioCategories>('basic');

  const handleScenarioSelect = (scenario: TestScenario) => {
    onSelectBarcode(scenario.barcode);
    setIsOpen(false);
  };

  const handleRandomSelect = () => {
    const scenario = getRandomScenario(selectedCategory);
    onSelectBarcode(scenario.barcode);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
        title="测试场景"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    );
  }

  const scenarios = getScenariosByCategory(selectedCategory);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <div className="bg-white rounded-lg shadow-lg border p-4 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">测试场景</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 类别选择 */}
        <div className="mb-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as keyof typeof scenarioCategories)}
            className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(scenarioCategories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* 随机选择按钮 */}
        <button
          onClick={handleRandomSelect}
          className="w-full mb-3 px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
        >
          🎲 随机选择 {scenarioCategories[selectedCategory]}
        </button>

        {/* 场景列表 */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {scenarios.map((scenario, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded p-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleScenarioSelect(scenario)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-900">
                  {scenario.name}
                </span>
                <span className={`text-xs px-1 py-0.5 rounded ${
                  scenario.expectedResult === 'PASS' 
                    ? 'bg-green-100 text-green-700'
                    : scenario.expectedResult === 'FAIL'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {scenario.expectedResult}
                </span>
              </div>
              <div className="text-xs text-gray-600 mb-1">
                {scenario.description}
              </div>
              <div className="text-xs font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                {scenario.barcode.length > 25 
                  ? scenario.barcode.substring(0, 25) + '...'
                  : scenario.barcode
                }
              </div>
            </div>
          ))}
        </div>

        {/* 说明 */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            点击场景自动填入条形码，或使用随机选择快速测试
          </p>
        </div>
      </div>
    </div>
  );
}
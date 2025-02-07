import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format } from 'date-fns';

const DateControls = ({ 
  selectedDate, 
  setSelectedDate, 
  granularity, 
  setGranularity,
  showGraph,
  setShowGraph 
}) => {
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    if (Array.isArray(selectedDate)) {
      setDateRange(selectedDate);
    } else {
      setDateRange([selectedDate, selectedDate]);
    }
  }, []);

  const handleDateChange = (update) => {
    setDateRange(update);
    if (update[0] && update[1]) {
      setSelectedDate(update);
    } else if (update[0] && !update[1]) {
      setSelectedDate([update[0], update[0]]);
    }
  };

  return (
    <div className="flex items-center gap-4 mb-6">
      <DatePicker
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={handleDateChange}
        className="bg-black text-white border border-gray-800 px-3 py-2 rounded"
        placeholderText="Select date range"
        dateFormat="MMM d, yyyy"
      />

      <div className="flex border border-gray-800">
        <button
          className={`px-4 py-2 ${granularity === 'day' ? 'bg-white text-black' : 'text-white'}`}
          onClick={() => setGranularity('day')}
        >
          Day
        </button>
        <button
          className={`px-4 py-2 border-l border-gray-800 ${granularity === 'week' ? 'bg-white text-black' : 'text-white'}`}
          onClick={() => setGranularity('week')}
        >
          Week
        </button>
      </div>

      <button
        className={`px-4 py-2 border border-gray-800 ${showGraph ? 'bg-white text-black' : 'text-white'}`}
        onClick={() => setShowGraph(!showGraph)}
      >
        {showGraph ? 'Hide Graph' : 'Show Graph'}
      </button>
    </div>
  );
};

export default DateControls; 
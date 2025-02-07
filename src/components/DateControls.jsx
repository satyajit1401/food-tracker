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
    <div className="flex flex-col sm:flex-row gap-4">
      <DatePicker
        selectsRange={true}
        startDate={startDate}
        endDate={endDate}
        onChange={handleDateChange}
        className="w-full sm:w-auto bg-black text-white border border-gray-800 px-3 py-2"
        placeholderText="Select date range"
        dateFormat="MMM d, yyyy"
      />

      <div className="grid grid-cols-2 sm:flex sm:inline-flex">
        <button
          className={`px-4 py-2 border ${
            granularity === 'day' ? 'bg-white text-black' : 'text-white'
          }`}
          onClick={() => setGranularity('day')}
        >
          Day
        </button>
        <button
          className={`px-4 py-2 border ${
            granularity === 'week' ? 'bg-white text-black' : 'text-white'
          }`}
          onClick={() => setGranularity('week')}
        >
          Week
        </button>
      </div>

      <button
        className={`px-4 py-2 border ${
          showGraph ? 'bg-white text-black' : 'text-white'
        }`}
        onClick={() => setShowGraph(!showGraph)}
      >
        {showGraph ? 'Hide Graph' : 'Show Graph'}
      </button>
    </div>
  );
};

export default DateControls; 
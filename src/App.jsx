import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import DateControls from './components/DateControls';
import { 
  format, 
  eachDayOfInterval, 
  subDays, 
  startOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays
} from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { useProfile } from './hooks/useProfile';

const API_URL = "https://flow-api.mira.network/v1/flows/flows/cosmic-labs/food-tracker";
const API_VERSION = "1.0.2";

const App = () => {
  const [session, setSession] = useState(null);
  const [meals, setMeals] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mealText, setMealText] = useState('');
  const [mealName, setMealName] = useState('');
  const [calculatedMeal, setCalculatedMeal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState([new Date(), new Date()]);
  const [granularity, setGranularity] = useState('day');
  const [showGraph, setShowGraph] = useState(false);
  const [graphType, setGraphType] = useState('macros');
  const [dateRangeMeals, setDateRangeMeals] = useState([]);
  const { profile, updateProfile } = useProfile();
  const [targetCalories, setTargetCalories] = useState(profile?.target_calories || '');

  useEffect(() => {
    if (profile?.target_calories) {
      setTargetCalories(profile.target_calories);
    }
  }, [profile]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchMeals();
    }
  }, [session, selectedDate, granularity]);

  const fetchMeals = async () => {
    if (!selectedDate[0] || !selectedDate[1]) return;

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', format(selectedDate[0], 'yyyy-MM-dd'))
      .lte('date', format(selectedDate[1], 'yyyy-MM-dd'))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching meals:', error);
      return;
    }

    setDateRangeMeals(data || []);
    setMeals(data || []);
  };

  const getDateRange = () => {
    switch (granularity) {
      case 'week':
        return {
          start: startOfWeek(Array.isArray(selectedDate) ? selectedDate[0] : selectedDate),
          end: endOfWeek(Array.isArray(selectedDate) ? selectedDate[0] : selectedDate)
        };
      default:
        return {
          start: Array.isArray(selectedDate) ? selectedDate[0] : selectedDate,
          end: Array.isArray(selectedDate) ? selectedDate[1] || selectedDate[0] : selectedDate
        };
    }
  };

  const getDailyTotals = () => {
    if (!selectedDate[0] || !selectedDate[1]) return [];
    
    const days = eachDayOfInterval({ 
      start: selectedDate[0], 
      end: selectedDate[1] 
    });
    
    return days.map(day => {
      const dayMeals = meals.filter(
        meal => meal.date === format(day, 'yyyy-MM-dd')
      );
      
      const totalCalories = dayMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      const netCalories = totalCalories - (profile?.target_calories || 0);
      
      return {
        date: format(day, 'MMM d'),
        fullDate: day,
        calories: totalCalories,
        netCalories: netCalories,
        protein: dayMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
        carbs: dayMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
        fats: dayMeals.reduce((sum, meal) => sum + (meal.fats || 0), 0),
        meals: dayMeals
      };
    });
  };

  const getWeeklyTotals = () => {
    const dailyTotals = getDailyTotals();
    if (!dailyTotals.length) return [];

    const weeks = [];
    let currentDate = startOfDay(selectedDate[1]);

    while (currentDate >= selectedDate[0]) {
      const weekStartDate = subDays(currentDate, 6);
      const weekEndDate = currentDate;

      const weekDays = dailyTotals.filter(
        day => day.fullDate >= weekStartDate && day.fullDate <= weekEndDate
      );

      if (weekDays.length > 0) {
        weeks.push({
          date: `${format(weekStartDate, 'MMM d')} - ${format(weekEndDate, 'MMM d')}`,
          fullStartDate: weekStartDate,
          calories: weekDays.reduce((sum, day) => sum + day.calories, 0),
          netCalories: weekDays.reduce((sum, day) => sum + day.netCalories, 0),
          protein: weekDays.reduce((sum, day) => sum + day.protein, 0),
          carbs: weekDays.reduce((sum, day) => sum + day.carbs, 0),
          fats: weekDays.reduce((sum, day) => sum + day.fats, 0)
        });
      }

      currentDate = subDays(weekStartDate, 1);
    }

    return weeks.sort((a, b) => b.fullStartDate - a.fullStartDate);
  };

  const getTotalNutrition = () => {
    const dailyTotals = getDailyTotals();
    return dailyTotals.reduce((total, day) => ({
      calories: (total.calories || 0) + day.calories,
      netCalories: (total.netCalories || 0) + day.netCalories,
      protein: (total.protein || 0) + day.protein,
      carbs: (total.carbs || 0) + day.carbs,
      fats: (total.fats || 0) + day.fats,
    }), {});
  };

  const calculateMeal = async (mealText) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}?version=${API_VERSION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'miraauthorization': process.env.REACT_APP_MIRA_API_KEY
        },
        body: JSON.stringify({
          input: {
            diet: mealText
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate meal nutrients');
      }

      const data = await response.json();
      
      let content = data.result.replace(/```markdown\n/, '').replace(/```$/, '');

      const caloriesMatch = content.match(/Calories:\s*\*\*(\d+)\s*kcal\*\*/);
      const proteinMatch = content.match(/Protein:\s*\*\*(\d+\.\d+|\d+)\s*g\*\*/);
      const carbsMatch = content.match(/Carbs:\s*\*\*(\d+)\s*g\*\*/);
      const fatsMatch = content.match(/Fats:\s*\*\*(\d+)\s*g\*\*/);

      const result = {
        calories: caloriesMatch ? parseInt(caloriesMatch[1]) : 0,
        protein: proteinMatch ? parseInt(proteinMatch[1]) : 0,
        carbs: carbsMatch ? parseInt(carbsMatch[1]) : 0,
        fats: fatsMatch ? parseInt(fatsMatch[1]) : 0,
        description: mealText,
        analysis: content
      };

      setCalculatedMeal(result);
    } catch (error) {
      console.error('Error details:', error);
      alert('Failed to calculate meal nutrients. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddMeal = () => {
    setEditingMeal(null);
    setMealText('');
    setMealName(`Meal ${meals.length + 1}`);
    setCalculatedMeal(null);
    setIsModalOpen(true);
  };

  const openEditMeal = (meal) => {
    setEditingMeal(meal);
    setMealText(meal.description);
    setMealName(meal.name);
    setCalculatedMeal({
      ...meal,
      analysis: meal.analysis
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMeal(null);
    setMealText('');
    setMealName('');
    setCalculatedMeal(null);
  };

  const saveMeal = async () => {
    if (!calculatedMeal) return;

    const mealData = {
      user_id: session.user.id,
      name: mealName,
      description: mealText,
      calories: calculatedMeal.calories,
      protein: calculatedMeal.protein,
      carbs: calculatedMeal.carbs,
      fats: calculatedMeal.fats,
      analysis: calculatedMeal.analysis,
      date: format(selectedDate[0], 'yyyy-MM-dd')
    };

    if (editingMeal) {
      const { error } = await supabase
        .from('meals')
        .update(mealData)
        .eq('id', editingMeal.id);

      if (error) {
        console.error('Error updating meal:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('meals')
        .insert([mealData]);

      if (error) {
        console.error('Error inserting meal:', error);
        return;
      }
    }

    fetchMeals();
    closeModal();
  };

  const deleteMeal = async (mealId) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId);

    if (error) {
      console.error('Error deleting meal:', error);
      return;
    }

    fetchMeals();
  };

  const updateCalorieTarget = async (e) => {
    e.preventDefault();
    await updateProfile({ target_calories: parseInt(targetCalories) });
  };

  const updateMealMacros = async (mealId, field, value) => {
    const updates = {
      [field]: parseInt(value) || 0
    };

    const { error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId);

    if (error) {
      console.error('Error updating meal:', error);
      return;
    }

    // Refresh meals after update
    fetchMeals();
  };

  if (!session) {
    return <Auth />;
  }

  const totals = getTotalNutrition();

  return (
    <div className="bg-black text-white">
      <header className="bg-black border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold">Anabolic Macro Tracker</h1>
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="relative group flex-1 sm:flex-initial">
                <button 
                  className="w-full sm:w-auto border border-gray-800 px-3 py-2 hover:bg-gray-900 transition-colors text-sm flex items-center gap-2"
                >
                  Target: {profile?.target_calories || 'Not set'} cal
                </button>
                <div className="absolute right-0 top-full mt-1 bg-black border border-gray-800 p-4 rounded shadow-lg hidden group-hover:block w-full sm:w-64 z-50">
                  <h3 className="text-sm text-gray-500 mb-3">Set Calorie Target</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(e.target.value)}
                      placeholder="Enter target"
                      className="bg-black border border-gray-800 px-3 py-2 text-white w-full"
                    />
                    <button
                      onClick={updateCalorieTarget}
                      className="border border-gray-800 px-3 py-2 hover:bg-gray-900 transition-colors"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="border border-gray-800 px-3 py-2 hover:bg-gray-900 transition-colors text-sm whitespace-nowrap"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="mb-6">
            <DateControls
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              granularity={granularity}
              setGranularity={setGranularity}
              showGraph={showGraph}
              setShowGraph={setShowGraph}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-2 sm:p-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">Calories</p>
              <p className="text-xl sm:text-2xl font-light mt-1">{totals.calories || 0}</p>
              <p className={`text-xs sm:text-sm mt-1 ${totals.netCalories > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {totals.netCalories > 0 ? '+' : ''}{totals.netCalories || 0} net
              </p>
            </div>
            <div className="p-2 sm:p-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">Protein</p>
              <p className="text-xl sm:text-2xl font-light mt-1">{totals.protein || 0}g</p>
            </div>
            <div className="p-2 sm:p-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">Carbs</p>
              <p className="text-xl sm:text-2xl font-light mt-1">{totals.carbs || 0}g</p>
            </div>
            <div className="p-2 sm:p-0">
              <p className="text-xs uppercase tracking-wider text-gray-500">Fats</p>
              <p className="text-xl sm:text-2xl font-light mt-1">{totals.fats || 0}g</p>
            </div>
          </div>

          {showGraph && (
            <div>
              <div className="grid grid-cols-2 sm:flex sm:inline-flex mb-4">
                <button
                  onClick={() => setGraphType('macros')}
                  className={`px-3 py-2 text-sm border ${
                    graphType === 'macros' 
                      ? 'border-white text-white' 
                      : 'border-gray-800 text-gray-500'
                  }`}
                >
                  Overall Graph
                </button>
                <button
                  onClick={() => setGraphType('net')}
                  className={`px-3 py-2 text-sm border ${
                    graphType === 'net' 
                      ? 'border-white text-white' 
                      : 'border-gray-800 text-gray-500'
                  }`}
                >
                  Net Calories
                </button>
              </div>

              <div className="h-[300px] sm:h-[400px] mb-8 -mx-4 sm:mx-0 overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%">
                  {graphType === 'macros' ? (
                    <LineChart 
                      data={granularity === 'day' ? 
                        getDailyTotals().sort((a, b) => a.fullDate - b.fullDate) : 
                        getWeeklyTotals().sort((a, b) => a.fullStartDate - b.fullStartDate)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                    >
                      <XAxis
                        dataKey="date"
                        interval="preserveStartEnd"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 12 }}
                        tickMargin={25}
                      />
                      <YAxis 
                        yAxisId="calories"
                        orientation="left"
                        stroke="#8884d8"
                        label={{ 
                          value: 'Calories', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: '#8884d8' }
                        }}
                      />
                      <YAxis 
                        yAxisId="macros"
                        orientation="right"
                        stroke="#82ca9d"
                        label={{ 
                          value: 'Macros (g)', 
                          angle: 90, 
                          position: 'insideRight',
                          style: { fill: '#82ca9d' }
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          padding: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend />
                      <Line 
                        yAxisId="calories"
                        type="monotone" 
                        dataKey="calories" 
                        stroke="#8884d8" 
                        dot={true}
                        name="Calories"
                      />
                      <Line 
                        yAxisId="macros"
                        type="monotone" 
                        dataKey="protein" 
                        stroke="#82ca9d" 
                        dot={true}
                        name="Protein (g)"
                      />
                      <Line 
                        yAxisId="macros"
                        type="monotone" 
                        dataKey="carbs" 
                        stroke="#ffc658" 
                        dot={true}
                        name="Carbs (g)"
                      />
                      <Line 
                        yAxisId="macros"
                        type="monotone" 
                        dataKey="fats" 
                        stroke="#ff7300" 
                        dot={true}
                        name="Fats (g)"
                      />
                    </LineChart>
                  ) : (
                    <BarChart
                      data={granularity === 'day' ? 
                        getDailyTotals().sort((a, b) => a.fullDate - b.fullDate) : 
                        getWeeklyTotals().sort((a, b) => a.fullStartDate - b.fullStartDate)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                    >
                      <XAxis
                        dataKey="date"
                        interval="preserveStartEnd"
                        angle={-45}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 12 }}
                        tickMargin={25}
                      />
                      <YAxis
                        label={{ 
                          value: 'Net Calories', 
                          angle: -90, 
                          position: 'insideLeft'
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          padding: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value) => [
                          <span className={value > 0 ? 'text-green-500' : 'text-red-500'}>
                            {value > 0 ? '+' : ''}{value} calories
                          </span>,
                          <span className="text-gray-400">
                            {value > 0 ? 'Surplus' : 'Deficit'}
                          </span>
                        ]}
                        labelStyle={{ color: '#9ca3af' }}
                        separator=": "
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Bar 
                        dataKey="netCalories"
                      >
                        {(granularity === 'day' ? 
                          getDailyTotals().sort((a, b) => a.fullDate - b.fullDate) : 
                          getWeeklyTotals().sort((a, b) => a.fullStartDate - b.fullStartDate)
                        ).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={entry.netCalories > 0 ? '#22c55e' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {selectedDate[0] && selectedDate[1] && 
           format(selectedDate[0], 'yyyy-MM-dd') === format(selectedDate[1], 'yyyy-MM-dd') && (
            <button
              onClick={openAddMeal}
              className="w-full sm:w-auto border border-white px-4 py-2 flex items-center justify-center gap-2 mb-6"
            >
              <Plus size={16} /> Add Meal
            </button>
          )}
        </div>
      </header>

      <main className="p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {granularity === 'day' && !(selectedDate[0] && selectedDate[1] && 
            format(selectedDate[0], 'yyyy-MM-dd') === format(selectedDate[1], 'yyyy-MM-dd')) ? (
            getDailyTotals()
              .sort((a, b) => b.fullDate - a.fullDate)
              .map(day => (
                <div key={day.date} className="border border-gray-800 p-2 sm:p-4">
                  <h3 className="text-base sm:text-lg font-light mb-2">{day.date}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-8 mb-4">
                    <div className="text-sm">
                      <span className="text-white">{day.calories}</span>
                      <span className="text-gray-500 ml-1">cal</span>
                    </div>
                    <div className="text-sm">
                      <span className={day.netCalories > 0 ? 'text-green-500' : 'text-red-500'}>
                        {day.netCalories > 0 ? '+' : ''}{day.netCalories}
                      </span>
                      <span className="text-gray-500 ml-1">net</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-white">{day.protein}</span>
                      <span className="text-gray-500 ml-1">p</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-white">{day.carbs}</span>
                      <span className="text-gray-500 ml-1">c</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-white">{day.fats}</span>
                      <span className="text-gray-500 ml-1">f</span>
                    </div>
                  </div>
                </div>
              ))
          ) : granularity === 'week' ? (
            getWeeklyTotals().map(week => (
              <div key={week.date} className="border border-gray-800 p-4">
                <h3 className="text-lg font-light mb-2">{week.date}</h3>
                <div className="flex gap-8">
                  <div className="text-sm">
                    <span className="text-white">{week.calories}</span>
                    <span className="text-gray-500 ml-1">cal</span>
                  </div>
                  <div className="text-sm">
                    <span className={week.netCalories > 0 ? 'text-green-500' : 'text-red-500'}>
                      {week.netCalories > 0 ? '+' : ''}{week.netCalories}
                    </span>
                    <span className="text-gray-500 ml-1">net</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white">{week.protein}</span>
                    <span className="text-gray-500 ml-1">p</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white">{week.carbs}</span>
                    <span className="text-gray-500 ml-1">c</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-white">{week.fats}</span>
                    <span className="text-gray-500 ml-1">f</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-gray-800 p-4">
              <h3 className="text-lg font-light mb-4">{format(selectedDate[0], 'MMM d, yyyy')}</h3>
              <div className="space-y-4">
                {meals
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map(meal => (
                    <div key={meal.id} className="border border-gray-800 p-4 rounded">
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-medium">{meal.name}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditMeal(meal)}
                              className="p-1 text-gray-500 hover:text-white transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deleteMeal(meal.id)}
                              className="p-1 text-gray-500 hover:text-white transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{meal.description}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs text-gray-500">Calories</label>
                            <input
                              type="number"
                              value={meal.calories}
                              onChange={(e) => updateMealMacros(meal.id, 'calories', e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Protein (g)</label>
                            <input
                              type="number"
                              value={meal.protein}
                              onChange={(e) => updateMealMacros(meal.id, 'protein', e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Carbs (g)</label>
                            <input
                              type="number"
                              value={meal.carbs}
                              onChange={(e) => updateMealMacros(meal.id, 'carbs', e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-white text-sm mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Fats (g)</label>
                            <input
                              type="number"
                              value={meal.fats}
                              onChange={(e) => updateMealMacros(meal.id, 'fats', e.target.value)}
                              className="w-full bg-black border border-gray-800 p-2 text-white text-sm mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="bg-black w-full max-w-2xl border border-gray-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-light">
                  {editingMeal ? 'Edit Meal' : 'Add New Meal'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-6">
              <input
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full bg-black border border-gray-800 p-3 mb-4 text-white focus:border-gray-700 outline-none"
                placeholder="Meal name"
              />
              
              <textarea
                value={mealText}
                onChange={(e) => setMealText(e.target.value)}
                placeholder="Describe your meal..."
                className="w-full h-32 bg-black border border-gray-800 p-3 mb-4 text-white focus:border-gray-700 outline-none resize-none"
              />
              
              <button
                onClick={() => calculateMeal(mealText)}
                disabled={!mealText.trim() || isLoading}
                className="border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors disabled:border-gray-800 disabled:text-gray-800"
              >
                {isLoading ? 'Calculating...' : 'Calculate'}
              </button>

              {calculatedMeal && (
                <div className="mt-6 border-t border-gray-800 pt-6">
                  <div className="markdown-body bg-black" style={{ backgroundColor: 'transparent' }}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <table className="min-w-full border border-gray-700 mt-4" {...props} />
                        ),
                        thead: ({node, ...props}) => (
                          <thead className="bg-gray-900" {...props} />
                        ),
                        tr: ({node, ...props}) => (
                          <tr className="border-b border-gray-700" {...props} />
                        ),
                        th: ({node, ...props}) => (
                          <th className="px-4 py-2 text-left text-gray-300 font-medium border-r border-gray-700" {...props} />
                        ),
                        td: ({node, ...props}) => (
                          <td className="px-4 py-2 text-gray-300 border-r border-gray-700" {...props} />
                        )
                      }}
                      className="text-gray-300"
                    >
                      {calculatedMeal.analysis}
                    </ReactMarkdown>
                  </div>
                  <button
                    onClick={saveMeal}
                    className="mt-6 w-full border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors"
                  >
                    {editingMeal ? 'Save Changes' : 'Add Meal'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
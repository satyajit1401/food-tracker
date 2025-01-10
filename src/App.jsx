import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'github-markdown-css';

const API_URL = "https://flow-api.mira.network/v1/flows/flows/cosmic-labs/food-tracker";
const API_VERSION = "1.0.1";

const App = () => {
  const [meals, setMeals] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mealText, setMealText] = useState('');
  const [mealName, setMealName] = useState('');
  const [calculatedMeal, setCalculatedMeal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);

  useEffect(() => {
    const savedMeals = localStorage.getItem('meals');
    if (savedMeals) {
      setMeals(JSON.parse(savedMeals));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('meals', JSON.stringify(meals));
  }, [meals]);

  const getTotalNutrition = () => {
    return meals.reduce((total, meal) => ({
      calories: (total.calories || 0) + (meal.calories || 0),
      protein: (total.protein || 0) + (meal.protein || 0),
      carbs: (total.carbs || 0) + (meal.carbs || 0),
      fats: (total.fats || 0) + (meal.fats || 0),
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
      
      // Get the response text without markdown code blocks
      let content = data.result.replace(/```markdown\n/, '').replace(/```$/, '');

      // Parse the nutrition values
      const caloriesMatch = content.match(/Calories:\s*(\d+)/);
      const proteinMatch = content.match(/Protein:\s*(\d+)\s*g/);
      const carbsMatch = content.match(/Carbs:\s*(\d+)\s*g/);
      const fatsMatch = content.match(/Fats:\s*(\d+)\s*g/);

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

  const saveMeal = () => {
    if (calculatedMeal) {
      if (editingMeal) {
        setMeals(meals.map(meal => 
          meal.id === editingMeal.id 
            ? { 
                ...meal, 
                ...calculatedMeal,
                name: mealName
              }
            : meal
        ));
      } else {
        const newMeal = {
          ...calculatedMeal,
          id: Date.now(),
          name: mealName
        };
        setMeals([...meals, newMeal]);
      }
      closeModal();
    }
  };

  const deleteMeal = (mealId) => {
    setMeals(meals.filter(meal => meal.id !== mealId));
  };

  const totals = getTotalNutrition();

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="h-screen flex flex-col">
        {/* Fixed Header */}
        <div className="bg-black border-b border-gray-800 p-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8">Nutrition Tracker</h1>
            <div className="grid grid-cols-4 gap-8 mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Calories</p>
                <p className="text-2xl font-light mt-1">{totals.calories || 0}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Protein</p>
                <p className="text-2xl font-light mt-1">{totals.protein || 0}g</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Carbs</p>
                <p className="text-2xl font-light mt-1">{totals.carbs || 0}g</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">Fats</p>
                <p className="text-2xl font-light mt-1">{totals.fats || 0}g</p>
              </div>
            </div>
            <button
              onClick={openAddMeal}
              className="border border-white px-6 py-3 flex items-center gap-2 hover:bg-white hover:text-black transition-colors"
            >
              <Plus size={20} /> Add Meal
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {meals.map((meal) => (
              <div key={meal.id} className="border border-gray-800 p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-light">{meal.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{meal.description}</p>
                  </div>
                  <div className="flex items-center gap-12">
                    <div className="flex gap-8">
                      <div className="text-sm">
                        <span className="text-white">{meal.calories}</span>
                        <span className="text-gray-500 ml-1">cal</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-white">{meal.protein}</span>
                        <span className="text-gray-500 ml-1">p</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-white">{meal.carbs}</span>
                        <span className="text-gray-500 ml-1">c</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-white">{meal.fats}</span>
                        <span className="text-gray-500 ml-1">f</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditMeal(meal)}
                        className="p-2 text-gray-500 hover:text-white transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="p-2 text-gray-500 hover:text-white transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="bg-black w-full max-w-2xl border border-gray-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
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

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <input
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                className="w-full bg-black border border-gray-800 p-3 mb-4 text-white focus:border-gray-700 outline-none"
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
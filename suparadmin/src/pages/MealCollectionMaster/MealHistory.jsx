import React, { useState, useEffect, useContext } from 'react';
import axios from '../../utils/axiosConfig';
import { toast } from 'react-toastify';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';

const MealHistory = () => {
  const { user: currentUser } = useContext(AuthContext);
  const [meals, setMeals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const location = useLocation();
  const userId = location.state?.userId;

  // Filter states for superadmin
  const [companies, setCompanies] = useState([]);
  const [places, setPlaces] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Load companies for superadmin
        if (currentUser?.userType === 'superadmin') {
          const companiesRes = await axios.get('/company');
          setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : companiesRes.data?.data || []);
        }

        if (userId) {
          // If userId is provided, fetch specific user's meals and details
          const [mealResponse, userResponse] = await Promise.all([
            axios.get(`/meal/history/${userId}`),
            axios.get(`/usermaster/${userId}`)
          ]);
          const mealData = mealResponse.data.data || [];
          setMeals(mealData);
          setFiltered(mealData);
          setUserDetails(userResponse.data);
        } else {
          // If no userId, fetch all meals
          const response = await axios.get('/meal/history');
          const mealData = response.data.data || [];
          setMeals(mealData);
          setFiltered(mealData);
        }
        setError(null);
      } catch (err) {
        setError('Failed to load meal history');
        toast.error('Failed to load meal history');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentUser?.userType]);

  // Load places when company changes
  useEffect(() => {
    const loadPlaces = async () => {
      if (selectedCompany !== 'all' && currentUser?.userType === 'superadmin') {
        try {
          const placesRes = await axios.get(`/places/company/${selectedCompany}`);
          setPlaces(Array.isArray(placesRes.data) ? placesRes.data : placesRes.data?.data || []);
        } catch (err) {
          setPlaces([]);
        }
      } else {
        setPlaces([]);
      }
    };

    loadPlaces();
  }, [selectedCompany, currentUser?.userType]);

  // Load locations when place changes
  useEffect(() => {
    const loadLocations = async () => {
      if (selectedPlace !== 'all' && currentUser?.userType === 'superadmin') {
        try {
          const locationsRes = await axios.get(`/locations/places/${selectedPlace}`);
          setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : locationsRes.data?.data || []);
        } catch (err) { 
          setLocations([]);
        }
      } else {
        setLocations([]);
      }
    };

    loadLocations();
  }, [selectedPlace, currentUser?.userType]);

  // Handle search and filtering
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    
    const results = meals.filter(meal => {
      const mealType = meal.mealType?.toLowerCase() || '';
      const userName = `${meal.userName || ''} ${meal.userLastName || ''}`.toLowerCase();
      const location = meal.location?.toLowerCase() || '';
      const packageName = meal.packageName?.toLowerCase() || '';
      
      // Superadmin filtering - handle both populated objects and direct IDs
      let matchesCompany = selectedCompany === 'all';
      let matchesPlace = selectedPlace === 'all';
      let matchesLocation = selectedLocation === 'all';
      
      // Check company match
      if (selectedCompany !== 'all') {
        const mealCompanyId = meal.companyId?._id || meal.companyId;
        matchesCompany = mealCompanyId === selectedCompany;
      }
      
      // Check place match
      if (selectedPlace !== 'all') {
        const mealPlaceId = meal.placeId?._id || meal.placeId;
        matchesPlace = mealPlaceId === selectedPlace;
      }
      
      // Check location match
      if (selectedLocation !== 'all') {
        const mealLocationId = meal.locationId?._id || meal.locationId;
        matchesLocation = mealLocationId === selectedLocation;
      }
      
      const matchesSearch = (
        mealType.includes(query) ||
        userName.includes(query) ||
        location.includes(query) ||
        packageName.includes(query)
      );

      // For superadmin, apply all filters
      if (currentUser?.userType === 'superadmin') {
        // If no filters are selected, show all meals
        if (selectedCompany === 'all' && selectedPlace === 'all' && selectedLocation === 'all') {
          return matchesSearch;
        }
        
        return matchesCompany && matchesPlace && matchesLocation && matchesSearch;
      }
      
      // For other users, only apply search
      return matchesSearch;
    });
    setFiltered(results);
    setCurrentPage(1); // Reset to first page on new search/filter
  }, [searchQuery, meals, selectedCompany, selectedPlace, selectedLocation, currentUser?.userType]);

  // Pagination logic
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Loading meal history...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="p-8 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    {userId ? 'User Meal History' : 'All Meal History'} 🍽️
                  </h1>
                  <p className="text-gray-600">
                    Track and manage meal collection records
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-full">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* User Details Section */}
          {userDetails && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">User Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-700"><strong>Name:</strong> {userDetails.firstName} {userDetails.lastName}</p>
                  
                </div>
                <div>
                  <p className="text-gray-700"><strong>Company:</strong> {userDetails.company?.name}</p>
                  <p className="text-gray-700"><strong>Location:</strong> {userDetails.locationId?.locationName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Controls Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <h2 className="text-lg font-semibold text-gray-800">Search & Filters</h2>
                <div className="flex gap-4 flex-wrap">
                  {/* Company dropdown for superadmin */}
                  {currentUser?.userType === 'superadmin' && (
                    <select
                      className="px-3 py-2 border rounded-md shadow-sm text-sm text-gray-700"
                      value={selectedCompany}
                      onChange={(e) => {
                        setSelectedCompany(e.target.value);
                        setSelectedPlace('all');
                        setSelectedLocation('all');
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Companies</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id}>{company.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Place dropdown for superadmin */}
                  {currentUser?.userType === 'superadmin' && selectedCompany !== 'all' && (
                    <select
                      className="px-3 py-2 border rounded-md shadow-sm text-sm text-gray-700"
                      value={selectedPlace}
                      onChange={(e) => {
                        setSelectedPlace(e.target.value);
                        setSelectedLocation('all');
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Places</option>
                      {places.map((place) => (
                        <option key={place._id} value={place._id}>{place.name}</option>
                      ))}
                    </select>
                  )}

                  {/* Location dropdown for superadmin */}
                  {currentUser?.userType === 'superadmin' && selectedPlace !== 'all' && (
                    <select
                      className="px-3 py-2 border rounded-md shadow-sm text-sm text-gray-700"
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">All Locations</option>
                      {locations.map((location) => (
                        <option key={location._id} value={location._id}>{location.locationName}</option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Search by user, meal type, location, or package"
                    className="px-4 py-2 border rounded-md text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            {paginated.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <p className="text-gray-500 text-lg font-medium">No meal history found</p>
                <p className="text-gray-400 text-sm">No meals have been recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                      {!userId && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Meal Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Package</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginated.map((meal, index) => (
                      <tr key={meal.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(new Date(meal.timestamp).getTime()).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(new Date(meal.timestamp).getTime()).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        {!userId && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium text-gray-900">{meal.userName} {meal.userLastName || ''}</div>
                              
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="capitalize">{meal.mealType}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {meal.packageName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {meal.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            meal.status === 'success' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {meal.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing page {currentPage} of {totalPages} ({totalItems} total meals)
                </div>
                <div className="flex space-x-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MealHistory;
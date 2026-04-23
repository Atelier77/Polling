import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PollFilters.css';

export interface FilterState {
  search: string;
  status: 'all' | 'active' | 'expired' | 'draft';
  sortBy: 'created_at' | 'total_votes' | 'end_date' | 'title';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  faculty?: string;
}

export interface PollFiltersProps {
  initialFilters?: Partial<FilterState>;
  onFiltersChange?: (filters: FilterState) => void;
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  status: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};

export const PollFilters = ({ 
  initialFilters = {}, 
  onFiltersChange 
}: PollFiltersProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const loadedFilters: Partial<FilterState> = {};
    
    if (params.get('search')) loadedFilters.search = params.get('search')!;
    if (params.get('status')) loadedFilters.status = params.get('status') as FilterState['status'];
    if (params.get('sortBy')) loadedFilters.sortBy = params.get('sortBy') as FilterState['sortBy'];
    if (params.get('sortOrder')) loadedFilters.sortOrder = params.get('sortOrder') as FilterState['sortOrder'];
    if (params.get('page')) loadedFilters.page = parseInt(params.get('page')!, 10);
    if (params.get('limit')) loadedFilters.limit = parseInt(params.get('limit')!, 10);
    if (params.get('faculty')) loadedFilters.faculty = params.get('faculty')!;
    
    setFilters(prev => ({ ...prev, ...loadedFilters }));
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
    if (filters.page > 1) params.set('page', filters.page.toString());
    if (filters.limit !== 10) params.set('limit', filters.limit.toString());
    if (filters.faculty) params.set('faculty', filters.faculty);
    
    navigate({ search: params.toString() }, { replace: true });
    onFiltersChange?.(filters);
  }, [filters, navigate, onFiltersChange]);

  const handleChange = (key: keyof FilterState, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'search' || key === 'status' || key === 'faculty' ? 1 : prev.page,
    }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
  };

  return (
    <div className="poll-filters">
      <div className="filters-row">
        {/* 🔹 Поиск */}
        <div className="filter-group">
          <label>Поиск</label>
          <input
            type="text"
            placeholder="Название или описание..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Статус</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="all">Все</option>
            <option value="active">Активные</option>
            <option value="expired">Завершённые</option>
            <option value="draft">Черновики</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Сортировка</label>
          <div className="sort-controls">
            <select
              value={filters.sortBy}
              onChange={(e) => handleChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="created_at">Дата создания</option>
              <option value="total_votes">Количество голосов</option>
              <option value="end_date">Дата окончания</option>
              <option value="title">Название</option>
            </select>
            <button
              onClick={() => handleChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={filters.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>На странице</label>
          <select
            value={filters.limit}
            onChange={(e) => handleChange('limit', parseInt(e.target.value))}
            className="filter-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="filters-actions">
        <button onClick={resetFilters} className="reset-btn">
          Сбросить фильтры
        </button>
        <span className="filters-info">
          Страница {filters.page} • Найдено: ...
        </span>
      </div>
    </div>
  );
};

export default PollFilters;
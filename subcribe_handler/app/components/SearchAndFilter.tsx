'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'

interface SearchAndFilterProps {
  onFilterChange: (filters: {
    search?: string
    category?: string
    minAmount?: number
    maxAmount?: number
    cycle?: string
    sortBy?: 'next_billing_date' | 'amount' | 'service_name'
    sortOrder?: 'asc' | 'desc'
  }) => void
}

const CATEGORIES = [
  '스트리밍',
  '클라우드',
  '소프트웨어',
  '음악',
  '게임',
  '뉴스',
  '교육',
  '기타',
]

export default function SearchAndFilter({ onFilterChange }: SearchAndFilterProps) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    minAmount: '',
    maxAmount: '',
    cycle: '',
    sortBy: 'next_billing_date' as 'next_billing_date' | 'amount' | 'service_name',
    sortOrder: 'asc' as 'asc' | 'desc',
  })

  const handleSearchChange = (value: string) => {
    setSearch(value)
    applyFilters(value, filters)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    applyFilters(search, newFilters)
  }

  const applyFilters = (searchValue: string, filterValues: typeof filters) => {
    onFilterChange({
      search: searchValue || undefined,
      category: filterValues.category || undefined,
      minAmount: filterValues.minAmount ? parseFloat(filterValues.minAmount) : undefined,
      maxAmount: filterValues.maxAmount ? parseFloat(filterValues.maxAmount) : undefined,
      cycle: filterValues.cycle || undefined,
      sortBy: filterValues.sortBy,
      sortOrder: filterValues.sortOrder,
    })
  }

  const clearFilters = () => {
    setSearch('')
    const clearedFilters = {
      category: '',
      minAmount: '',
      maxAmount: '',
      cycle: '',
      sortBy: 'next_billing_date' as const,
      sortOrder: 'asc' as const,
    }
    setFilters(clearedFilters)
    applyFilters('', clearedFilters)
  }

  const hasActiveFilters = search || filters.category || filters.minAmount || filters.maxAmount || filters.cycle

  return (
    <div className="space-y-4">
      {/* 검색바 */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f6368]" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="서비스명 또는 메모로 검색..."
          className="w-full rounded-xl border border-[#dadce0] bg-white px-12 py-3 text-sm text-[#202124] placeholder:text-[#80868b] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
        />
        {search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5f6368] hover:bg-[#f1f3f4]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 필터 버튼 및 패널 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
          >
            <Filter className="h-4 w-4" />
            필터 {hasActiveFilters && `(${Object.values(filters).filter(v => v).length + (search ? 1 : 0)})`}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 rounded-full border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] transition-all duration-200 hover:bg-[#f8f9fa] hover:border-[#c4c7c5]"
            >
              <X className="h-4 w-4" />
              필터 초기화
            </button>
          )}
        </div>

        {showFilters && (
          <div className="rounded-xl border border-[#dadce0] bg-white p-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  카테고리
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="">전체</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  결제 주기
                </label>
                <select
                  value={filters.cycle}
                  onChange={(e) => handleFilterChange('cycle', e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="">전체</option>
                  <option value="monthly">월간</option>
                  <option value="yearly">연간</option>
                  <option value="quarterly">분기</option>
                  <option value="weekly">주간</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  최소 금액 (원)
                </label>
                <input
                  type="number"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  최대 금액 (원)
                </label>
                <input
                  type="number"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  placeholder="무제한"
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  정렬 기준
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="next_billing_date">다음 결제일</option>
                  <option value="amount">금액</option>
                  <option value="service_name">서비스명</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#5f6368] mb-2">
                  정렬 순서
                </label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] px-4 py-2 text-sm text-[#202124] focus:border-[#1a73e8] focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20"
                >
                  <option value="asc">오름차순</option>
                  <option value="desc">내림차순</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


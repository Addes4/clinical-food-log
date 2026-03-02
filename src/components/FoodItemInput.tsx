'use client'

import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export interface FoodItem {
  rawInput: string
  quantity?: string
  unit?: string
}

interface FoodItemInputProps {
  items: FoodItem[]
  onChange: (items: FoodItem[]) => void
}

const UNITS = ['g', 'ml', 'dl', 'st', 'portion', 'handfull', 'tbsp', 'tsp', 'cup', 'slice', 'piece']

export function FoodItemInput({ items, onChange }: FoodItemInputProps) {
  function updateItem(index: number, field: keyof FoodItem, value: string) {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onChange(updated)
  }

  function addItem() {
    onChange([...items, { rawInput: '', quantity: '', unit: '' }])
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <Input
            placeholder="Food item (e.g. falukorv, pasta, lax)"
            value={item.rawInput}
            onChange={(e) => updateItem(index, 'rawInput', e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Qty"
            type="number"
            min={0}
            value={item.quantity ?? ''}
            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
            className="w-20"
          />
          <Select
            value={item.unit ?? ''}
            onChange={(e) => updateItem(index, 'unit', e.target.value)}
            className="w-28"
          >
            <option value="">Unit</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeItem(index)}
            className="text-gray-400 hover:text-red-500 px-2"
          >
            ✕
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        + Add food item
      </Button>
    </div>
  )
}

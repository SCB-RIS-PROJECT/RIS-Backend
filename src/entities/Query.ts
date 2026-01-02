export interface RangedFilter {
    key: string;
    start: any;
    end: any;
}

export interface FilteringQueryV2 {
    page?: number;
    rows?: number;
    cursor?: string;
    orderKey?: string;
    orderRule?: string;
    filters?: Record<string, any | any[] | null>;
    searchFilters?: Record<string, any | null>;
    rangedFilters?: RangedFilter[];
}

export interface PagedList<T> {
    entries: T;
    totalData: number;
    totalPage: number;
}

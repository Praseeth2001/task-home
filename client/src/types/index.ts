export interface SpotifyRecord {
  id: string;
  track_id:                   string;
  track_name:                 string;
  track_artist:               string;
  track_album_id:             string;
  track_album_name:           string;
  track_album_release_date:   string;
  playlist_name:              string;
  playlist_id:                string;
  playlist_genre:             string;
  playlist_subgenre:          string;
  track_popularity:           number;
  track_explicit:             boolean | number;
  danceability:               number;
  energy:                     number;
  key:                        number;
  loudness:                   number;
  mode:                       number;
  speechiness:                number;
  acousticness:               number;
  instrumentalness:           number;
  liveness:                   number;
  valence:                    number;
  tempo:                      number;
  duration_ms:                number;
  time_signature:             number;
}

export type SortOrder = "asc" | "desc";

export interface SortState {
  column: keyof SpotifyRecord | null;
  order:  SortOrder;
}

export interface PaginationState {
  page:  number;
  limit: number;
}

export interface FilterState {
  search:       string;
  textFilters:  Partial<Record<keyof SpotifyRecord, string>>;
  multiSelect:  Partial<Record<keyof SpotifyRecord, string[]>>;
  numericRange: Partial<Record<keyof SpotifyRecord, { min?: number; max?: number }>>;
}

export interface PaginatedResponse<T> {
  data:       T[];
  totalCount: number;
}

export interface ColumnPreference {
  id:      string;
  visible: boolean;
  order:   number;
}

export interface EditingCell {
  rowId:         string;
  column:        keyof SpotifyRecord;
  originalValue: SpotifyRecord[keyof SpotifyRecord];
}

export type SelectionScope = "page" | "all";

export interface BulkSelectionState {
  selectedIds: Set<string>;
  scope:       SelectionScope | null;
}

export interface TableState {
  sort:       SortState;
  pagination: PaginationState;
  filters:    FilterState;
  editing:    EditingCell | null;
  selection:  BulkSelectionState;
}

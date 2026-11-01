// The script-facing shapes live in the v1 contract; these names are what the
// implementation imports.
export type {
	KBLinkV1 as KBLink,
	KBElOptionsV1 as KBElOptions,
	KBPageV1 as KBPage,
	KBTaskV1 as KBTask,
	AggregateStatsV1 as AggregateStats,
} from './contract/kb-api.v1';

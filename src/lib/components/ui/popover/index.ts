import { Popover as PopoverPrimitive } from "bits-ui";
import Content from "./popover-content.svelte";

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;
const Portal = PopoverPrimitive.Portal;

export {
	Root,
	Trigger,
	Content,
	Portal,
	Root as Popover,
	Trigger as PopoverTrigger,
	Content as PopoverContent,
	Portal as PopoverPortal,
};

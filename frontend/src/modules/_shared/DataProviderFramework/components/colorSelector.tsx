import { ColorTile } from "@lib/components/ColorTile";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuItem } from "@lib/components/MenuItem";
import { Dropdown } from "@mui/base";

export const COLOR_OPTIONS = [
    "#FF6633", // Orange - good contrast
    "#FF99CC", // Pink - good contrast
    "#00D4FF", // Cyan - good contrast
    "#FFD966", // Yellow - good contrast
    "#66B2FF", // Light blue - good contrast
    "#99FF99", // Light green - good contrast
    "#FFB366", // Light orange - good contrast
    "#B3E6B3", // Pale green - good contrast
    "#E6B3FF", // Lavender - good contrast
    "#FFE6B3", // Cream - good contrast
] as const;

export type ColorSelectorProps = {
    color: string;
    onChange: (newColor: (typeof COLOR_OPTIONS)[number]) => void;
};

export function ColorSelector(props: ColorSelectorProps): React.ReactNode {
    return (
        <>
            <Dropdown>
                <MenuButton label="Select color">
                    <ColorTile color={props.color} />
                </MenuButton>
                <Menu anchorOrigin="bottom-end">
                    {COLOR_OPTIONS.map((colorOption) => (
                        <MenuItem key={colorOption} onClick={() => props.onChange(colorOption)}>
                            <div className="flex items-center gap-2">
                                <ColorTile color={colorOption} />
                                <span>{colorOption}</span>
                            </div>
                        </MenuItem>
                    ))}
                </Menu>
            </Dropdown>
        </>
    );
}

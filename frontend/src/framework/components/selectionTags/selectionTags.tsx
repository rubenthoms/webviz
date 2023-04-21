import { Tag } from "./private-components/tag";

export type SelectionTagsProps = {
    value: string[];
};

export const SelectionTags: React.FC<SelectionTagsProps> = ({ value }) => {
    return (
        <div>
            {value.map((tag) => (
                <Tag key={tag} label={tag} />
            ))}
        </div>
    );
};

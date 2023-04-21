export type TagProps = {
    label: string;
};

export const Tag: React.FC<TagProps> = ({ label }) => {
    return <div>{label}</div>;
};

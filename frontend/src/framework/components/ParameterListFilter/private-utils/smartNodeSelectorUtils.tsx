import type { Parameter } from "@framework/EnsembleParameters";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import type { TreeDataNode } from "@lib/newComponents/SmartNodeSelector";
import { Check, Segment } from "@mui/icons-material";

export const ParameterParentNodeNames = {
    NAME: "Name",
    GROUP: "Group",
    CONTINUOUS: "Continuous", // For Parameter.type === ParameterType.CONTINUOUS
    DISCRETE: "Discrete", // For Parameter.type === ParameterType.DISCRETE
    IS_CONSTANT: "Constant", // For Parameter.isConstant === true
    IS_NONCONSTANT: "Nonconstant", // For Parameter.isConstant === false
    IS_LOGARITHMIC: "Logarithmic", // For Parameter.isLogarithmic === true
    IS_LINEAR: "Linear", // For Parameter.isLogarithmic === false
} as const;

export function createAndAddNode(
    treeNodeDataList: TreeDataNode[],
    nodeName: string,
    icon?: React.ReactNode,
): TreeDataNode {
    const newNode: TreeDataNode = { name: nodeName, description: "", icon };
    treeNodeDataList.push(newNode);
    return newNode;
}

export function createTreeDataNodeListFromParameters(parameters: Parameter[]): TreeDataNode[] {
    if (parameters.length === 0) {
        return [];
    }

    const regularParameterIcon = <Check style={{ fontSize: "0.75rem" }} />;
    const groupParameterIcon = <Segment style={{ fontSize: "0.75rem" }} />;

    const treeDataNodeList: TreeDataNode[] = [];

    const hasContinuousParameter = parameters.some((parameter) => parameter.type === ParameterType.CONTINUOUS);

    // Node for boolean/state properties on top level
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.CONTINUOUS, regularParameterIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.DISCRETE, regularParameterIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_CONSTANT, regularParameterIcon);
    createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_NONCONSTANT, regularParameterIcon);
    if (hasContinuousParameter) {
        createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_LOGARITHMIC, regularParameterIcon);
        createAndAddNode(treeDataNodeList, ParameterParentNodeNames.IS_LINEAR, regularParameterIcon);
    }

    // Add parameter name and check for group name
    const parameterNameSet = new Set<string>();
    const groupNameSet = new Set<string>();
    for (const parameter of parameters) {
        parameterNameSet.add(parameter.name);

        if (parameter.groupName) {
            groupNameSet.add(parameter.groupName);
        }
    }

    // Add parameter names
    if (parameterNameSet.size !== 0) {
        const nameParentNode = createAndAddNode(treeDataNodeList, ParameterParentNodeNames.NAME, groupParameterIcon);
        nameParentNode.children = [];
        for (const parameterName of parameterNameSet) {
            createAndAddNode(nameParentNode.children, parameterName);
        }
    }

    // Add parameter groups
    if (groupNameSet.size !== 0) {
        const groupParentNode = createAndAddNode(treeDataNodeList, ParameterParentNodeNames.GROUP, groupParameterIcon);
        groupParentNode.children = [];
        for (const groupName of groupNameSet) {
            createAndAddNode(groupParentNode.children, groupName);
        }
    }

    return treeDataNodeList;
}

export function getChildNodeNamesFromParentNodeName(
    nodes: string[],
    parentNodeName: string,
    delimiter = ":",
): string[] {
    return nodes
        .filter((node) => node.split(delimiter, 1)[0] === parentNodeName)
        .map((node) => node.split(delimiter, 2)[1]);
}

export function getParametersMatchingSelectedNodes(
    parameters: Parameter[],
    selectedNodes: string[],
    delimiter = ":",
): Parameter[] {
    // No selection implies no filtering
    if (selectedNodes.length === 0) {
        return parameters;
    }

    const isContinuousSelected = selectedNodes.includes(ParameterParentNodeNames.CONTINUOUS);
    const isDiscreteSelected = selectedNodes.includes(ParameterParentNodeNames.DISCRETE);
    const isConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_CONSTANT);
    const isNonConstantSelected = selectedNodes.includes(ParameterParentNodeNames.IS_NONCONSTANT);
    const isLogarithmicSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LOGARITHMIC);
    const isLinearSelected = selectedNodes.includes(ParameterParentNodeNames.IS_LINEAR);

    // Intersection filtering, i.e. parameter cannot be both continuous and discrete, constant and non-constant, logarithmic and linear
    if (isContinuousSelected && isDiscreteSelected) return [];
    if (isConstantSelected && isNonConstantSelected) return [];
    if (isLogarithmicSelected && isLinearSelected) return [];

    const selectedParameterNames = getChildNodeNamesFromParentNodeName(
        selectedNodes,
        ParameterParentNodeNames.NAME,
        delimiter,
    );
    const selectedParameterGroups = getChildNodeNamesFromParentNodeName(
        selectedNodes,
        ParameterParentNodeNames.GROUP,
        delimiter,
    );

    const isNoParameterPropertyAmongSelectedNodes =
        !isContinuousSelected &&
        !isDiscreteSelected &&
        !isConstantSelected &&
        !isNonConstantSelected &&
        !isLogarithmicSelected &&
        !isLinearSelected &&
        selectedParameterNames.length === 0 &&
        selectedParameterGroups.length === 0;
    if (isNoParameterPropertyAmongSelectedNodes) {
        return [];
    }

    const selectedEnsembleParameters: Parameter[] = [];
    for (const parameter of parameters) {
        // Filter by parameter name
        if (selectedParameterNames.length !== 0 && !selectedParameterNames.includes(parameter.name)) {
            continue;
        }

        // Filter by parameter group
        if (selectedParameterGroups.length !== 0 && parameter.groupName === null) {
            continue;
        }
        if (
            selectedParameterGroups.length !== 0 &&
            parameter.groupName !== null &&
            !selectedParameterGroups.includes(parameter.groupName)
        ) {
            continue;
        }

        // Intersection filter by parameter type (continuous/discrete)
        if (isContinuousSelected && parameter.type !== ParameterType.CONTINUOUS) continue;
        if (isDiscreteSelected && parameter.type !== ParameterType.DISCRETE) continue;

        // Intersection filter by parameter is constant/non-constant
        if (isConstantSelected && !parameter.isConstant) continue;
        if (isNonConstantSelected && parameter.isConstant) continue;

        // Filter by parameter is logarithmic/linear (only for continuous parameters)
        if (isLogarithmicSelected && parameter.type === ParameterType.CONTINUOUS && !parameter.isLogarithmic) continue;
        if (isLinearSelected && parameter.type === ParameterType.CONTINUOUS && parameter.isLogarithmic) continue;

        // Prevent duplicates
        const parameterIdent = ParameterIdent.fromNameAndGroup(parameter.name, parameter.groupName);
        if (
            selectedEnsembleParameters.some((elm) =>
                ParameterIdent.fromNameAndGroup(elm.name, elm.groupName).equals(parameterIdent),
            )
        ) {
            continue;
        }

        selectedEnsembleParameters.push(parameter);
    }

    return selectedEnsembleParameters;
}

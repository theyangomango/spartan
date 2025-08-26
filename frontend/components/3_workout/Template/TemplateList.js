import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import TemplateCard from "./TemplateCard";

export default function TemplateList({
    templates,
    onReorder,                    // parent handles setTemplates + save
    setTemplates,                 // compat shim if older callsites exist
    openEditTemplateBottomSheet,  // expects tid or full template
    startWorkoutFromTemplate,     // expects tid or full template
}) {
    const data = useMemo(() => templates || [], [templates]);

    const keyExtractor = useCallback(
        (item, index) => (item?.tid ? String(item.tid) : `tpl-${index}`),
        []
    );

    const renderItem = useCallback(
        ({ item, drag, isActive }) => (
            <ScaleDecorator>
                <TemplateCard
                    template={item}
                    isActive={isActive}
                    // pass a stable identifier, not an index
                    handlePressEditButton={() => openEditTemplateBottomSheet(item.tid || item)}
                    handlePressStartButton={() => startWorkoutFromTemplate(item.tid || item)}
                    onDrag={drag}
                />
            </ScaleDecorator>
        ),
        [openEditTemplateBottomSheet, startWorkoutFromTemplate]
    );

    return (
        <DraggableFlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            onDragEnd={({ data: newData, from, to }) => {
                if (from !== to) (onReorder || setTemplates)?.(newData);
            }}
            activationDistance={12}
            autoscrollSpeed={160}
            autoscrollThreshold={60}
            dragItemOverflow={false}
            removeClippedSubviews={false}   // prevents blink on some devices after drop
            windowSize={10}
            initialNumToRender={8}
            ListHeaderComponent={<View style={{ height: 4 }} />}
            contentContainerStyle={{ paddingBottom: 40 }}
        />
    );
}

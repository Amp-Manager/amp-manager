import React from "react";
import { useDatabases } from "@/components/databases/hooks/useDatabases";
import { DatabaseHeader } from "@/components/databases/DatabaseHeader";
import { DatabaseForm } from "@/components/databases/DatabaseForm";
import { DatabaseList } from "@/components/databases/DatabaseList";
import { DeleteConfirmModal } from "@/components/databases/DeleteConfirmModal";

export default function Databases() {
  const {
    allTags,
    loading,
    searchQuery,
    setSearchQuery,
    isRefreshing,
    isDbRunning,
    lastUpdated,
    formData,
    setFormData,
    isCreating,
    dbToDelete,
    confirmModalRef,
    filteredDbs,
    fetchDatabases,
    loadTags,
    handleCreate,
    handleDeleteClick,
    handleConfirmDelete,
    handleOpenTool,
    getUsageCount
  } = useDatabases();

  return (
    <div className="space-y-8">
      <DatabaseHeader
        isDbRunning={isDbRunning}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
        onRefresh={fetchDatabases}
        onOpenTool={handleOpenTool}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 mb-0">
        <DatabaseForm 
          formData={formData}
          setFormData={setFormData}
          isCreating={isCreating}
          onSubmit={handleCreate}
          getUsageCount={getUsageCount}
          onTagsUpdated={loadTags}
        />

        <DatabaseList 
          loading={loading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredDbs={filteredDbs}
          allTags={allTags}
          onDelete={handleDeleteClick}
        />
      </div>

      <DeleteConfirmModal 
        modalRef={confirmModalRef}
        dbName={dbToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          confirmModalRef.current?.close();
        }}
      />
    </div>
  );
}
